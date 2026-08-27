const mongoose = require('mongoose');

const bidSubmissionSchema = new mongoose.Schema(
  {
    tender: { type: mongoose.Schema.Types.ObjectId, ref: "Tender", required: true },
    sellerProfile: { type: mongoose.Schema.Types.ObjectId, ref: "SellerProfile", required: true },

    submittedAt: { type: Date, default: Date.now },

    // --- Tender-specific declared values (bidder self-declares, subject to document verification) ---
    declaredTurnoverLakhs: { type: Number, default: null },
    declaredLocalContentPercent: { type: Number, default: null }, // MII %
    miiClass: { type: String, enum: ["Class1", "Class2", null], default: null },
    isOemForOfferedCatalog: { type: Boolean, default: false }, // "Are you an OEM...to avail MSE preference?"
    requestingEmdExemption: { type: Boolean, default: false },
    emdExemptionCategory: {
      type: String,
      enum: [
        "Start-up", "Turnover>=500Cr", "VendorAssessed", "KVIC", "ACASH", "WDO",
        "CoirBoard", "TRIFED", "KendriyaBhandar", "BISLicense", "CentralStatePSUs",
        "RegisteredWithDesignatedAgency", null
      ],
      default: null,
    },

    // --- AI-generated fields (advisory only) ---
    complianceScore: { type: Number, min: 0, max: 100, default: null },
    riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH", null], default: null },
    aiRecommendation: { type: String, default: null },

    // --- Human decision fields ---
    officerDecision: {
      type: String,
      enum: ["PENDING", "QUALIFIED", "DISQUALIFIED", "CLARIFICATION_REQUESTED"],
      default: "PENDING",
    },
    officerDecisionReason: { type: String, default: null },
    officerDecidedAt: { type: Date, default: null },
    officerId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BidSubmission', bidSubmissionSchema);
