require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const BidSubmission = require("./models/BidSubmission");
const SellerProfile = require("./models/SellerProfile");
const Tender = require("./models/Tender");
const { runBidSubmissionChecks } = require("./services/verificationOrchestrator");
const { calculateComplianceScore } = require("./services/scoringEngine");
const { generateRecommendation } = require("./services/recommendationEngine");

async function batchRun() {
  await connectDB();

  const bids = await BidSubmission.find({}).populate("sellerProfile");
  console.log(`Running full pipeline for ${bids.length} bids...\n`);

  for (const bid of bids) {
    try {
      const tender = await Tender.findById(bid.tender);
      const profile = bid.sellerProfile;
      
      await runBidSubmissionChecks(bid, profile);
      const { finalScore, riskLevel } = await calculateComplianceScore(bid._id);
      await generateRecommendation(bid._id);
      console.log(`  ✓ ${profile.companyName} — Score: ${finalScore}, Risk: ${riskLevel}`);
    } catch (err) {
      console.log(`  ✗ ${bid.sellerProfile.companyName} — FAILED: ${err.message}`);
    }
  }

  console.log("\nBatch run complete.");
  await mongoose.connection.close();
}

batchRun().catch((err) => {
  console.error("Batch run failed:", err);
  process.exit(1);
});