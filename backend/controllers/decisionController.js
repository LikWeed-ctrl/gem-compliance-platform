const BidSubmission = require("../models/BidSubmission");
const AuditLog = require("../models/AuditLog");

const VALID_DECISIONS = ["QUALIFIED", "DISQUALIFIED", "CLARIFICATION_REQUESTED"];

async function recordOfficerDecision(req, res) {
  try {
    const { decision, reason, officerId } = req.body;

    if (!VALID_DECISIONS.includes(decision)) {
      return res.status(400).json({
        error: `decision must be one of: ${VALID_DECISIONS.join(", ")}`,
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        error: "A reason (minimum 10 characters) is required for every officer decision — this is mandatory for audit accountability.",
      });
    }

    if (!officerId || officerId.trim().length === 0) {
      return res.status(400).json({
        error: "officerId is required — every decision must be attributable to a specific officer.",
      });
    }

    const bid = await BidSubmission.findById(req.params.id).populate("sellerProfile");
    if (!bid) return res.status(404).json({ error: "Bid not found" });

    // detect whether this decision contradicts the AI's own risk signal
    const aiSuggestedCaution = bid.riskLevel === "HIGH" || bid.riskLevel === "MEDIUM";
    const officerQualifiedDespiteRisk = decision === "QUALIFIED" && aiSuggestedCaution;
    const officerDisqualifiedDespiteLowRisk =
      decision === "DISQUALIFIED" && bid.riskLevel === "LOW";
    const isOverride = officerQualifiedDespiteRisk || officerDisqualifiedDespiteLowRisk;

    bid.officerDecision = decision;
    bid.officerDecisionReason = reason.trim();
    bid.officerDecidedAt = new Date();
    bid.officerId = officerId.trim();
    await bid.save();

    // always log the decision itself
    await AuditLog.create({
      sellerProfile: bid.sellerProfile._id,
      bidSubmission: bid._id,
      tender: bid.tender,
      actionType: "OFFICER_DECISION_MADE",
      actor: `officer:${officerId.trim()}`,
      actorRole: "OFFICER",
      description: `Officer recorded decision: ${decision} for bid from ${bid.sellerProfile.companyName}`,
      reason: reason.trim(),
      metadata: {
        decision,
        aiRiskLevelAtTimeOfDecision: bid.riskLevel,
        aiComplianceScoreAtTimeOfDecision: bid.complianceScore,
        isOverride,
      },
    });

    // if this decision contradicts the AI's risk signal, log it as its own distinct event
    if (isOverride) {
      await AuditLog.create({
        sellerProfile: bid.sellerProfile._id,
        bidSubmission: bid._id,
        tender: bid.tender,
        actionType: "OFFICER_OVERRODE_AI_FLAG",
        actor: `officer:${officerId.trim()}`,
        actorRole: "OFFICER",
        description: `Officer decision (${decision}) diverges from AI risk assessment (${bid.riskLevel}). This override has been logged for review.`,
        reason: reason.trim(),
        metadata: {
          decision,
          aiRiskLevel: bid.riskLevel,
          aiComplianceScore: bid.complianceScore,
        },
      });
    }

    res.json({
      message: "Officer decision recorded successfully",
      bid,
      wasOverride: isOverride,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { recordOfficerDecision };