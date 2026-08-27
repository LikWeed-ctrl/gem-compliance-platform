const mongoose = require("mongoose");

const tenderSchema = new mongoose.Schema(
  {
    tenderId: { type: String, required: true, unique: true }, // e.g. GEM/2026/B/12345
    title: { type: String, required: true },
    department: { type: String, required: true },

    // Eligibility clauses stored as flexible JSON so the rule engine
    // reads only what's relevant to THIS tender — not generic one-size KYC
    eligibilityRules: {
      msmePreference: { type: Boolean, default: false },
      makeInIndiaMinPercent: { type: Number, default: null },
      oemAuthorizationRequired: { type: Boolean, default: false },
      nsicEmdWaiverApplicable: { type: Boolean, default: false },
      minTurnoverLakhs: { type: Number, default: null },
      startupIndiaRelaxation: { type: Boolean, default: false },
      minExperienceYears: { type: Number, default: null },
      pastPerformanceMinValueLakhs: { type: Number, default: null },
    },
    requiredDocuments: { type: [String], default: [] },

    publishedDate: { type: Date, default: Date.now },
    bidSubmissionDeadline: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true } // adds createdAt/updatedAt automatically
);

module.exports = mongoose.model("Tender", tenderSchema);