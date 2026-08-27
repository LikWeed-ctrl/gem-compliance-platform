const mongoose = require("mongoose");

const complianceCheckSchema = new mongoose.Schema(
  {
    sellerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerProfile",
      required: true,
    },
    bidSubmission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BidSubmission",
      default: null,
    },

    category: {
      type: String,
      enum: [
        "UDYAM_MSME",
        "GST_REGISTRATION",
        "GST_RETURN_FILING",
        "PAN_INCOME_TAX",
        "MAKE_IN_INDIA",
        "EPFO",
        "ESIC",
        "STARTUP_INDIA",
        "NSIC",
        "OEM_AUTHORIZATION",
        "MCA21_STATUS",
        "DIGILOCKER_DOC",
        "BLACKLIST_DEBARMENT",
        "CROSS_FIELD_CONSISTENCY",
        "TENDER_SPECIFIC",
      ],
      required: true,
    },

    result: {
      type: String,
      enum: ["PASS", "FAIL", "WARNING", "NOT_APPLICABLE", "COULD_NOT_VERIFY"],
      required: true,
    },

    // --- Explainability fields — every flag must be traceable ---
    sourceType: {
      type: String,
      enum: ["LIVE_API", "SIMULATED", "DOCUMENT_OCR", "MANUAL_LIST"],
      required: true,
    },
    sourceName: { type: String, required: true }, // e.g. "RapidAPI - GST Return Status", "Mock Udyam Service"

    detail: { type: String, required: true }, // human-readable explanation
    // e.g. "GST returns not filed for Q2 FY26"

    rawResponse: { type: mongoose.Schema.Types.Mixed, default: null }, // exact source data, for audit trail

    checkedAt: { type: Date, default: Date.now, index: true },

    // weight this check contributes to the overall compliance score
    weight: { type: Number, default: 1.0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ComplianceCheck", complianceCheckSchema);