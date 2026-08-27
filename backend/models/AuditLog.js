const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // what this log entry relates to
    sellerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerProfile",
      default: null,
    },
    bidSubmission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BidSubmission",
      default: null,
    },
    tender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tender",
      default: null,
    },

    actionType: {
      type: String,
      enum: [
        "DOCUMENT_UPLOADED",
        "OCR_EXTRACTED",
        "COMPLIANCE_CHECK_RUN",
        "SCORE_CALCULATED",
        "AI_RECOMMENDATION_GENERATED",
        "OFFICER_VIEWED_DASHBOARD",
        "OFFICER_DECISION_MADE",
        "OFFICER_OVERRODE_AI_FLAG", // explicitly separate — key differentiator
        "CLARIFICATION_REQUESTED",
        "RECHECK_TRIGGERED", // e.g. compliance drift re-verification
      ],
      required: true,
    },

    // who / what performed the action
    actor: { type: String, required: true }, // e.g. "system", "officer:priya.sharma", "ai_engine"
    actorRole: {
      type: String,
      enum: ["SYSTEM", "OFFICER", "AI"],
      required: true,
    },

    description: { type: String, required: true }, // human-readable summary
    reason: { type: String, default: null }, // required for overrides/decisions (enforced at API layer)

    metadata: { type: mongoose.Schema.Types.Mixed, default: null }, // extra structured context

    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);