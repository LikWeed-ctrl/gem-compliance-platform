const ComplianceCheck = require("../models/ComplianceCheck");
const BidSubmission = require("../models/BidSubmission");
const AuditLog = require("../models/AuditLog");

const RESULT_POINTS = {
  PASS: 100,
  WARNING: 50,
  FAIL: 0,
};

function computeRiskLevel(score, hasActiveBlacklistFail) {
  if (hasActiveBlacklistFail) return "HIGH";
  if (score >= 80) return "LOW";
  if (score >= 50) return "MEDIUM";
  return "HIGH";
}

async function calculateComplianceScore(bidSubmissionId) {
  const bidSubmission = await BidSubmission.findById(bidSubmissionId).populate("sellerProfile");
  if (!bidSubmission) throw new Error("BidSubmission not found");

  const sellerProfileId = bidSubmission.sellerProfile._id;

  const checks = await ComplianceCheck.find({
    $or: [
      { bidSubmission: bidSubmissionId },
      { sellerProfile: sellerProfileId }
    ]
  });

  const scorable = checks.filter(
    (c) => c.result === "PASS" || c.result === "WARNING" || c.result === "FAIL"
  );

  let weightedScore = 0;
  let totalWeight = 0;

  for (const check of scorable) {
    const points = RESULT_POINTS[check.result] ?? 0;
    weightedScore += points * check.weight;
    totalWeight += check.weight;
  }

  let finalScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : null;

  const hasActiveBlacklistFail = checks.some(
    (c) => c.category === "BLACKLIST_DEBARMENT" && c.result === "FAIL"
  );
  
  const hasPanFail = checks.some(
    (c) => c.category === "PAN_INCOME_TAX" && c.result === "FAIL"
  );

  const hasTenderFail = checks.some(
    (c) => c.category === "TENDER_SPECIFIC" && c.result === "FAIL"
  );

  if (finalScore !== null) {
    if (hasPanFail) {
      finalScore = 0;
    } else if (hasActiveBlacklistFail || hasTenderFail) {
      finalScore = Math.min(finalScore, 20);
    }
  }

  const riskLevel = finalScore !== null ? computeRiskLevel(finalScore, hasActiveBlacklistFail || hasPanFail || hasTenderFail) : null;

  bidSubmission.complianceScore = finalScore;
  bidSubmission.riskLevel = riskLevel;
  await bidSubmission.save();

  await AuditLog.create({
    sellerProfile: sellerProfileId,
    bidSubmission: bidSubmissionId,
    actionType: "SCORE_CALCULATED",
    actor: "ai_engine",
    actorRole: "AI",
    description: `Compliance score calculated: ${finalScore}/100, risk level: ${riskLevel}`,
    metadata: {
      score: finalScore,
      riskLevel,
      checksConsidered: scorable.length,
      hasActiveBlacklistFail,
    },
  });

  return { bidSubmission, checks, finalScore, riskLevel };
}

module.exports = { calculateComplianceScore };