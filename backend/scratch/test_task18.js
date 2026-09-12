const mongoose = require("mongoose");
require('dotenv').config({ path: __dirname + '/../.env' });
const connectDB = require("../config/db");
const SellerProfile = require("../models/SellerProfile");
const Tender = require("../models/Tender");
const Document = require("../models/Document");
const BidSubmission = require("../models/BidSubmission");
const ComplianceCheck = require("../models/ComplianceCheck");
const { runBidSubmissionChecks } = require("../services/verificationOrchestrator");
const { calculateComplianceScore } = require("../services/scoringEngine");

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, testName) {
    if (actual === expected) {
        console.log(`[PASS] ${testName}`);
        passed++;
    } else {
        console.error(`[FAIL] ${testName} (expected ${expected}, got ${actual})`);
        failed++;
    }
}

async function runAllTests() {
    await connectDB();
    
    // Cleanup for demo reset
    await SellerProfile.deleteMany({});
    await Tender.deleteMany({});
    await BidSubmission.deleteMany({});
    await ComplianceCheck.deleteMany({});
    await Document.deleteMany({});

    console.log("=== Testing Task 18: Consolidated E2E Demo Hardening ===");

    try {
        const tender = await Tender.create({ 
            tenderId: "T_DEMO_2026", 
            title: "SIH Demo Tender", 
            department: "Ministry of IT", 
            bidSubmissionDeadline: new Date(Date.now() + 86400000),
            eligibilityRules: {
                minExperienceYears: 3,
                pastPerformanceMinValueLakhs: 80,
                minTurnoverLakhs: 100,
                miiMinLocalContent: 50
            },
            requiredDocuments: [
                "EXPERIENCE_CRITERIA",
                "PAST_PERFORMANCE",
                "BIDDER_TURNOVER",
                "MII_CERTIFICATE",
                "OEM_AUTHORIZATION_CERTIFICATE"
            ]
        });

        // ==========================================
        // CASE A: CLEAN BID (Same Seller, Bid 1)
        // ==========================================
        console.log("\n--- Scenario: CASE A - CLEAN BID ---");
        const seller1 = await SellerProfile.create({ 
            companyName: "Clean Corp Solutions", 
            panNumber: "PAN_CLEAN",
            gstin: "GST_CLEAN"
        });
        const bid1 = await BidSubmission.create({ tender: tender._id, sellerProfile: seller1._id });

        const cleanDocs = [
            { docType: "EXPERIENCE_CRITERIA", fields: { bidderName: "Clean Corp Solutions", contractNumber: "PO-123", contractValue: "100 Lakhs", commencementDate: "2020-01-01", actualCompletionDate: "2023-01-01" } },
            { docType: "PAST_PERFORMANCE", fields: { purchaseOrderNumber: "PO-123", totalOrderValue: "100 Lakhs" } },
            { docType: "BIDDER_TURNOVER", fields: { turnoverLakhs: 200, gstin: "GST_CLEAN", pan: "PAN_CLEAN" } },
            { docType: "MII_CERTIFICATE", fields: { localContentPercent: 60, model: "X700" } },
            { docType: "OEM_AUTHORIZATION_CERTIFICATE", fields: { model: "X700", oemName: "OEM Inc", bidderName: "Clean Corp Solutions" } }
        ];

        for (const docData of cleanDocs) {
            await Document.create({
                bidSubmission: bid1._id,
                sellerProfile: seller1._id,
                documentCategory: "TENDER_SPECIFIC",
                docType: docData.docType,
                originalFilename: `${docData.docType}.pdf`,
                filePath: "/test.pdf",
                extractedFields: docData.fields,
                verificationStatus: "PENDING"
            });
        }
        
        await runBidSubmissionChecks(bid1, seller1);
        let res1 = await calculateComplianceScore(bid1._id);
        
        console.log("Deductions for Clean Bid:");
        res1.checks.filter(c => c.status !== 'PASS').forEach(c => {
            console.log(c.sourceName, c.status, JSON.stringify(c.rawResponse));
        });

        assertEqual(res1.riskLevel, "LOW", "Clean Bid should be LOW risk");
        assertEqual(res1.finalScore > 90, true, "Clean Bid should score > 90");
        let modelCrossCheck1 = res1.checks.find(c => c.sourceName === "Cross-Document Engine")?.rawResponse?.find(r => r.rule === "MII_VS_OEM_AUTH");
        assertEqual(modelCrossCheck1?.status, "PASS", "Exact model match across docs should PASS");

        // ==========================================
        // CASE B: BORDERLINE BID
        // ==========================================
        console.log("\n--- Scenario: CASE B - BORDERLINE BID ---");
        const seller2 = await SellerProfile.create({ 
            companyName: "Borderline Technologies", 
            panNumber: "PAN_BORDER",
            gstin: "GST_BORDER"
        });
        const bid2 = await BidSubmission.create({ tender: tender._id, sellerProfile: seller2._id });

        const borderDocs = [
            { docType: "EXPERIENCE_CRITERIA", fields: { bidderName: "Borderline Tech", completionStatus: "ONGOING", actualCompletionDate: "2023-01-01" } }, 
            { docType: "PAST_PERFORMANCE", fields: { purchaseOrderNumber: "PO-456", totalOrderValue: "90 Lakhs" } },
            { docType: "BIDDER_TURNOVER", fields: { turnoverLakhs: 110 } },
            { docType: "MII_CERTIFICATE", fields: { localContentPercent: 50, model: "X500 PRO" } }, 
            { docType: "OEM_AUTHORIZATION_CERTIFICATE", fields: { model: "X500", oemName: "OEM Inc" } }
        ];

        for (const docData of borderDocs) {
            await Document.create({ 
                bidSubmission: bid2._id, 
                sellerProfile: seller2._id, 
                documentCategory: "TENDER_SPECIFIC", 
                docType: docData.docType, 
                originalFilename: `${docData.docType}.pdf`,
                filePath: "/test.pdf",
                extractedFields: docData.fields 
            });
        }
        
        await runBidSubmissionChecks(bid2, seller2);
        let res2 = await calculateComplianceScore(bid2._id);
        
        let idCheck = res2.checks.find(c => c.sourceName.includes("EXPERIENCE_CRITERIA"))?.rawResponse?.find(r => r.rule === "BIDDER_OWNERSHIP");
        assertEqual(idCheck?.status, "PASS", "Identity substring (Borderline Tech) should PASS");
        
        let statusCheck = res2.checks.find(c => c.sourceName.includes("EXPERIENCE_CRITERIA"))?.rawResponse?.find(r => r.rule === "INTERNAL_CONSISTENCY");
        assertEqual(statusCheck?.status, "REVIEW", "ONGOING with completion date should REVIEW");

        let modelCrossCheck2 = res2.checks.find(c => c.sourceName === "Cross-Document Engine")?.rawResponse?.find(r => r.rule === "MII_VS_OEM_AUTH");
        assertEqual(modelCrossCheck2?.status, "REVIEW", "X500 vs X500 PRO should REVIEW");

        assertEqual(res2.riskLevel, "MEDIUM", "Borderline Bid should be MEDIUM risk");

        // ==========================================
        // CASE C: FAILING BID
        // ==========================================
        console.log("\n--- Scenario: CASE C - FAILING BID ---");
        const seller3 = await SellerProfile.create({ 
            companyName: "Failing Corp", 
            panNumber: "PAN_FAIL",
            gstin: "GST_FAIL"
        });
        const bid3 = await BidSubmission.create({ tender: tender._id, sellerProfile: seller3._id });

        const failDocs = [
            { docType: "EXPERIENCE_CRITERIA", fields: { bidderName: "Failing Corp", contractNumber: "PO-999" } },
            { docType: "PAST_PERFORMANCE", fields: { purchaseOrderNumber: "PO-777" } },
            { docType: "BIDDER_TURNOVER", fields: { turnoverLakhs: 50, gstin: "GST_WRONG" } },
            { docType: "OEM_AUTHORIZATION_CERTIFICATE", fields: { model: "ABC5000" } }
        ];

        for (const docData of failDocs) {
            await Document.create({ 
                bidSubmission: bid3._id, 
                sellerProfile: seller3._id, 
                documentCategory: "TENDER_SPECIFIC", 
                docType: docData.docType, 
                originalFilename: `${docData.docType}.pdf`,
                filePath: "/test.pdf",
                extractedFields: docData.fields 
            });
        }
        
        await runBidSubmissionChecks(bid3, seller3);
        let res3 = await calculateComplianceScore(bid3._id);

        let gstinCheck = res3.checks.find(c => c.sourceName.includes("BIDDER_TURNOVER"))?.rawResponse?.find(r => r.rule === "BIDDER_OWNERSHIP");
        assertEqual(gstinCheck?.status, "FAIL", "GST_WRONG mismatch should FAIL");

        let tenderCoverage = res3.checks.find(c => c.sourceName === "Tender Requirement Coverage")?.rawResponse;
        let turnoverCheck = tenderCoverage.find(r => r.documentType === "BIDDER_TURNOVER");
        assertEqual(turnoverCheck?.status, "FAIL", "Turnover 50 < 100 should FAIL");

        let miiReqCheck = tenderCoverage.find(r => r.documentType === "MII_CERTIFICATE");
        assertEqual(miiReqCheck?.status, "FAIL", "Missing mandatory MII doc should FAIL");

        let crossCheck3 = res3.checks.find(c => c.sourceName === "Cross-Document Engine")?.rawResponse?.find(r => r.rule === "EXP_VS_PAST_PERFORMANCE");
        assertEqual(crossCheck3?.status, "REVIEW", "PO-999 vs PO-777 should REVIEW cross-doc mismatch");

        assertEqual(res3.finalScore < 60, true, "Failing Bid should have severe score deductions");
        assertEqual(res3.riskLevel, "HIGH", "Failing Bid should be HIGH risk");

        // ==========================================
        // CASE D: SAME-SELLER ISOLATION (Bid 4)
        // ==========================================
        console.log("\n--- Scenario: SAME-SELLER MULTI-BID ISOLATION ---");
        const bid4 = await BidSubmission.create({ tender: tender._id, sellerProfile: seller1._id });
        await Document.create({ 
            bidSubmission: bid4._id, 
            sellerProfile: seller1._id, 
            documentCategory: "TENDER_SPECIFIC", 
            docType: "BIDDER_TURNOVER", 
            originalFilename: `BIDDER_TURNOVER.pdf`,
            filePath: "/test.pdf",
            extractedFields: { turnoverLakhs: 20 } 
        });
        await runBidSubmissionChecks(bid4, seller1);
        let res4 = await calculateComplianceScore(bid4._id);

        assertEqual(res1.finalScore !== res4.finalScore, true, "Bid 1 and Bid 4 (Same Seller) must have distinct scores");
        
        const bid1DocCount = await Document.countDocuments({ bidSubmission: bid1._id });
        const bid4DocCount = await Document.countDocuments({ bidSubmission: bid4._id });
        assertEqual(bid1DocCount === 5 && bid4DocCount === 1, true, "Documents are strictly scoped to bidSubmission ID");

    } catch (e) {
        console.error(e);
        failed++;
    } finally {
        console.log(`\nResults: ${passed} passed, ${failed} failed`);
        if (failed > 0) process.exitCode = 1;
        process.exit();
    }
}

runAllTests();
