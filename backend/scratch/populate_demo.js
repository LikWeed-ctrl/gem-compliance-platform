require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Tender = require("../models/Tender");
const SellerProfile = require("../models/SellerProfile");
const BidSubmission = require("../models/BidSubmission");
const Document = require("../models/Document");
const ComplianceCheck = require("../models/ComplianceCheck");
const AuditLog = require("../models/AuditLog");

const { runBidSubmissionChecks } = require("../services/verificationOrchestrator");

const API_URL = "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_prototype";
const PDFS_DIR = path.join(__dirname, "demo_pdfs");

const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" });

const biddersData = [
    // T1 - IT Hardware
    {
        id: "B1", name: "TechVision Systems Pvt Ltd", gstin: "27AAACT1111A1Z1",
        turnover: 800, exp_years: 4, mii: 60, past_perf: 120, tender: "T1", wo_value: 120,
        docs: ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "MII", "OEM"]
    },
    {
        id: "B2", name: "InnoTech Solutions Limited", gstin: "27AAACT2222A1Z1",
        turnover: 600, exp_years: 3.5, mii: 50, past_perf: 110, tender: "T1", wo_value: 110,
        docs: ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "MII", "OEM"]
    },
    {
        id: "B3", name: "Apex Hardware Corp", gstin: "27AAACT3333A1Z1",
        turnover: 200, exp_years: 3, mii: 50, past_perf: 100, tender: "T1", wo_value: 100,
        docs: ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "OEM"] // Missing MII
    },
    // T2 - Medical Equipment
    {
        id: "B4", name: "LifeCare Medtech Pvt Ltd", gstin: "27AAACT4444A1Z1",
        turnover: 1500, exp_years: 6, past_perf: 800, tender: "T2", wo_value: 800,
        docs: ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "PAST_PERFORMANCE", "OEM"]
    },
    {
        id: "B5", name: "MediEquip India Pvt Ltd", gstin: "27AAACT5555A1Z1", // Intentionally correct here, but doc has "Medical Equipments Ltd"
        turnover: 1100, exp_years: 5.5, past_perf: 600, tender: "T2", wo_value: 600,
        docs: ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "PAST_PERFORMANCE", "OEM"]
    },
    {
        id: "B6", name: "Global Health Systems", gstin: "27AAACT6666A1Z1",
        turnover: 1050, exp_years: 5.5, past_perf: 500, tender: "T2", wo_value: 400,
        docs: ["EXPERIENCE", "WORK_ORDER", "TURNOVER", "PAST_PERFORMANCE", "OEM"]
    },
    // T3 - Solar
    {
        id: "B7", name: "SunRay Energy Solutions", gstin: "27AAACT7777A1Z1",
        turnover: 500, exp_years: 4, past_perf: 300, tender: "T3", wo_value: 300,
        docs: ["EXPERIENCE", "PAST_PERFORMANCE", "TURNOVER"]
    },
    {
        id: "B8", name: "EcoPower Renewables", gstin: "27AAACT8888A1Z1",
        turnover: 250, exp_years: 3, past_perf: 160, tender: "T3", wo_value: 160,
        docs: ["EXPERIENCE", "PAST_PERFORMANCE", "TURNOVER"]
    },
    {
        id: "B9", name: "VoltTech Electricals", gstin: "27AAACT9999A1Z1", // Profile has correct GSTIN, doc has wrong
        turnover: 400, exp_years: 3, past_perf: 200, tender: "T3", wo_value: 200,
        docs: ["EXPERIENCE", "TURNOVER"]
    },
    // T4 - Infra
    {
        id: "B10", name: "Bharat Infra Services Ltd", gstin: "27AAACT0000A1Z1",
        turnover: 250, exp_years: 2, tender: "T4", wo_value: 150,
        docs: ["EXPERIENCE", "WORK_ORDER", "TURNOVER"]
    },
    {
        id: "B11", name: "National Builders Pvt Ltd", // doc has "National Builders"
        turnover: 150, exp_years: 1.5, tender: "T4", wo_value: 110, gstin: "27AAACT1122A1Z1",
        docs: ["EXPERIENCE", "WORK_ORDER", "TURNOVER"]
    },
    {
        id: "B12", name: "Urban Dev Projects", gstin: "27AAACT1212A1Z1",
        turnover: 120, exp_years: 0.5, tender: "T4", wo_value: 100,
        docs: ["EXPERIENCE", "WORK_ORDER", "TURNOVER"]
    }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Clean up all old Demo data
    await Tender.deleteMany({ tenderId: { $regex: /^T_2026/ } });
    const oldUsers = await User.find({ email: { $regex: /@demo.com$/ } });
    for (let u of oldUsers) {
        await SellerProfile.deleteOne({ _id: u.sellerProfileId });
        await Document.deleteMany({ uploadedBy: u._id });
        await BidSubmission.deleteMany({ sellerProfile: u.sellerProfileId });
        await ComplianceCheck.deleteMany({ sellerProfile: u.sellerProfileId });
        await AuditLog.deleteMany({ sellerProfile: u.sellerProfileId });
        await User.deleteOne({ _id: u._id });
    }
    console.log("Cleaned up old demo data.");

    // Create 4 Tenders
    const tenders = {
        "T1": await Tender.create({
            tenderId: "T_2026_IT_001",
            title: "IT Hardware / Network Equipment",
            department: "Ministry of IT",
            description: "Supply of Network Routers and Switches",
            requiredDocuments: ["EXPERIENCE_CRITERIA", "WORK_ORDER", "BIDDER_TURNOVER", "MII_CERTIFICATE", "OEM_AUTHORIZATION_CERTIFICATE"],
            eligibilityRules: {
                minTurnoverLakhs: 500, minExperienceYears: 3, pastPerformanceMinValueLakhs: 100,
                makeInIndiaMinPercent: 50, oemAuthorizationRequired: true
            },
            isActive: true, bidSubmissionDeadline: new Date(2026, 11, 31)
        }),
        "T2": await Tender.create({
            tenderId: "T_2026_MED_002",
            title: "Medical Equipment (MRI Scanners)",
            department: "Ministry of Health",
            description: "Supply and installation of 10 MRI Scanners",
            requiredDocuments: ["EXPERIENCE_CRITERIA", "WORK_ORDER", "BIDDER_TURNOVER", "PAST_PERFORMANCE", "OEM_AUTHORIZATION_CERTIFICATE"],
            eligibilityRules: {
                minTurnoverLakhs: 1000, minExperienceYears: 5, pastPerformanceMinValueLakhs: 500,
                makeInIndiaMinPercent: 20, oemAuthorizationRequired: true
            },
            isActive: true, bidSubmissionDeadline: new Date(2026, 11, 31)
        }),
        "T3": await Tender.create({
            tenderId: "T_2026_SOL_003",
            title: "Solar / Electrical Equipment",
            department: "Ministry of New and Renewable Energy",
            description: "Supply of Solar Panels 500W",
            requiredDocuments: ["EXPERIENCE_CRITERIA", "PAST_PERFORMANCE", "BIDDER_TURNOVER"],
            eligibilityRules: {
                minTurnoverLakhs: 300, minExperienceYears: 2, pastPerformanceMinValueLakhs: 150
            },
            isActive: true, bidSubmissionDeadline: new Date(2026, 11, 31)
        }),
        "T4": await Tender.create({
            tenderId: "T_2026_INF_004",
            title: "Government Office Infrastructure",
            department: "Ministry of Housing and Urban Affairs",
            description: "Supply of Office Furniture",
            requiredDocuments: ["EXPERIENCE_CRITERIA", "WORK_ORDER", "BIDDER_TURNOVER"],
            eligibilityRules: {
                minTurnoverLakhs: 100, minExperienceYears: 1
            },
            isActive: true, bidSubmissionDeadline: new Date(2026, 11, 31)
        })
    };
    console.log("Created Tenders.");

    let results = [];

    // Process Bidders
    for (const b of biddersData) {
        console.log(`Processing Bidder: ${b.name}...`);
        
        const sellerProfile = await SellerProfile.create({
            companyName: b.name,
            panNumber: "ABCDE1234F",
            gstin: b.gstin || "27AAACT0000A1Z1",
            cin: "U72900MH2020PTC123456",
            udyamNumber: "UDYAM-MH-00-1234567"
        });

        const user = await User.create({
            email: `${b.id.toLowerCase()}@demo.com`,
            password: "password123",
            role: "SELLER",
            sellerProfileId: sellerProfile._id
        });

        const tender = tenders[b.tender];
        
        const bidSubmission = await BidSubmission.create({
            tender: tender._id,
            sellerProfile: sellerProfile._id,
            status: "SUBMITTED"
        });

        const token = generateToken(user._id);

        // Upload documents
        for (const docType of b.docs) {
            const filename = `${b.id}_${docType}.pdf`;
            const filepath = path.join(PDFS_DIR, filename);
            if (!fs.existsSync(filepath)) {
                console.log(`WARN: Missing file ${filepath}`);
                continue;
            }

            const formData = new FormData();
            formData.append("document", fs.createReadStream(filepath));
            formData.append("docType", docType === "EXPERIENCE" ? "EXPERIENCE_CRITERIA" : docType === "TURNOVER" ? "BIDDER_TURNOVER" : docType === "MII" ? "MII_CERTIFICATE" : docType === "OEM" ? "OEM_AUTHORIZATION_CERTIFICATE" : docType);
            formData.append("documentCategory", "TENDER_SPECIFIC"); formData.append("bidSubmissionId", bidSubmission._id.toString());
            
            try {
                await axios.post(`${API_URL}/documents`, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        "Authorization": `Bearer ${token}`
                    }
                });
                console.log(`  Uploaded ${docType}`);
                await sleep(500); // Slight delay for safety
            } catch (err) {
                console.error(`  Upload failed for ${docType}:`, err.response?.data || err.message);
            }
        }

        // Run Verification
        console.log(`  Running Verification Engine...`);
        
        // Wait, running verification might crash if we just call the API? 
        // We can just call runBidSubmissionChecks directly since we're in backend context!
        try {
            await runBidSubmissionChecks(bidSubmission, sellerProfile);
            const { calculateComplianceScore } = require("../services/scoringEngine");
            const scoreResult = await calculateComplianceScore(bidSubmission._id);
            if (scoreResult.error) console.log("  Score error:", scoreResult.error);
            
            const updatedBid = await BidSubmission.findById(bidSubmission._id);
            console.log(`  => Score: ${updatedBid.complianceScore} | Status: ${updatedBid.complianceStatus}`);
            
            results.push({
                Tender: tender.title,
                Bidder: b.name,
                Score: updatedBid.complianceScore,
                Status: updatedBid.complianceStatus
            });
        } catch (err) {
            console.error(`  Verification failed:`, err);
        }
    }

    console.log("\\n\\n================= RESULTS =================\\n");
    console.table(results);

    process.exit(0);
}

run().catch(console.error);
