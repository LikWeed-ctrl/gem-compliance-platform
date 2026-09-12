require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const path = require("path");

const Tender = require("../models/Tender");
const SellerProfile = require("../models/SellerProfile");
const BidSubmission = require("../models/BidSubmission");
const Document = require("../models/Document");
const ComplianceCheck = require("../models/ComplianceCheck");
const { processDocument } = require("../services/ocrService");
const { runBidSubmissionChecks } = require("../services/verificationOrchestrator");
const { calculateComplianceScore } = require("../services/scoringEngine");
const { generateRecommendation } = require("../services/recommendationEngine");

async function runTests() {
  await connectDB();

  // Find the Zenith Software Solutions bid (or any active bid)
  const profile = await SellerProfile.findOne({ companyName: /Zenith/i });
  if (!profile) {
      console.error("Seller profile not found. Did you run seed.js?");
      process.exit(1);
  }

  const bid = await BidSubmission.findOne({ sellerProfile: profile._id });
  if (!bid) {
      console.error("Bid submission not found.");
      process.exit(1);
  }

  const tender = await Tender.findById(bid.tender);

  console.log(`\n--- Starting Test for Bidder: ${profile.companyName} ---`);
  
  // Clean up existing tender-specific documents for this bid to avoid duplicates
  await Document.deleteMany({ bidSubmission: bid._id });
  await ComplianceCheck.deleteMany({
    $or: [{ bidSubmission: bid._id }, { sellerProfile: profile._id }]
  });

  const testFiles = [
    { name: "01_experience_certificate.pdf", docType: "EXPERIENCE_CRITERIA" },
    { name: "02_past_performance.pdf", docType: "PAST_PERFORMANCE" },
    { name: "03_oem_authorization.pdf", docType: "OEM_AUTHORIZATION_CERTIFICATE" },
    { name: "04_make_in_india.pdf", docType: "MII_CERTIFICATE" },
    { name: "05_bidder_turnover.pdf", docType: "BIDDER_TURNOVER" },
    { name: "06_work_order.pdf", docType: "WORK_ORDER" },
  ];

  console.log("\n[1/3] Simulating Document Uploads and LLM Extraction (Layer A)...");
  
  for (const fileObj of testFiles) {
      const filePath = path.join(__dirname, "perfect_pdfs", fileObj.name);
      console.log(`   -> Processing ${fileObj.name} as ${fileObj.docType}...`);
      
      const tenderDocReq = tender.documentRequirements.find(r => r.documentType === fileObj.docType);
      const ocrResult = await processDocument(filePath, fileObj.docType, "TENDER_SPECIFIC", tenderDocReq);
      
      // Delay to avoid hitting Groq API 7000 ITPM rate limit
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      await Document.create({
          sellerProfile: profile._id,
          bidSubmission: bid._id,
          documentCategory: "TENDER_SPECIFIC",
          docType: fileObj.docType,
          filePath: filePath,
          originalFilename: fileObj.name,
          extractedFields: ocrResult.extractedFields,
          ocrConfidence: ocrResult.ocrConfidence,
          verificationStatus: ocrResult.verificationStatus,
          rawText: ocrResult.rawText
      });
  }

  console.log("\n[2/3] Running Advanced Tender Document Verification Pipeline (Layers B, C, D)...");
  const checks = await runBidSubmissionChecks(bid, profile);
  
  console.log("\n[3/3] Calculating Final Score...");
  await new Promise(resolve => setTimeout(resolve, 15000));
  const { finalScore, riskLevel } = await calculateComplianceScore(bid._id);

  console.log("\n================ RESULTS ================\n");
  console.log(`Final Compliance Score: ${finalScore}/100`);
  console.log(`Risk Level: ${riskLevel}`);

  console.log("\n--- TENDER SPECIFIC CHECKS ---");
  const tenderChecks = checks.filter(c => c.category === "TENDER_SPECIFIC");
  
  for (const check of tenderChecks) {
      console.log(`\nCheck: ${check.sourceName}`);
      console.log(`Status: ${check.result}`);
      console.log(`Detail: ${check.detail}`);
      
      if (check.rawResponse && Array.isArray(check.rawResponse)) {
          console.log(`  [Detailed Rule Results]`);
          for (const rule of check.rawResponse) {
              console.log(`   - Rule: ${rule.rule} => ${rule.status}`);
              if (rule.required) console.log(`       Required: ${rule.required}`);
              if (rule.found) console.log(`       Found: ${rule.found}`);
              console.log(`       Reason: ${rule.reason}`);
          }
      }
  }

  console.log("\n=========================================\n");
  process.exit(0);
}

runTests();
