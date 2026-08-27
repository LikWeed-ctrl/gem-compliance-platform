const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    sellerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SellerProfile",
      required: true,
    },
    bidSubmission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BidSubmission",
      required: false, // Only required for TENDER_SPECIFIC documents
    },

    documentCategory: {
      type: String,
      enum: ["REGISTRATION", "TENDER_SPECIFIC"],
      required: true,
    },

    docType: {
      type: String,
      enum: [
        // REGISTRATION category
        "PAN", "CIN_CERTIFICATE", "GST_CERTIFICATE", "UDYAM_CERTIFICATE",
        "DIPP_STARTUP_CERTIFICATE", "BANK_PROOF", "ITR",
        // TENDER_SPECIFIC category
        "EXPERIENCE_CRITERIA", "PAST_PERFORMANCE", "BIDDER_TURNOVER",
        "OEM_AUTHORIZATION_CERTIFICATE", "OEM_ANNUAL_TURNOVER",
        "MII_CERTIFICATE", "EMD_EXEMPTION_SUPPORTING_DOC", "ATC_ADDITIONAL_DOC",
      ],
      required: true,
    },

    filePath: { type: String, required: true },
    originalFilename: { type: String, required: true },

    uploadedAt: { type: Date, default: Date.now },

    extractedFields: { type: mongoose.Schema.Types.Mixed, default: null },
    ocrConfidence: { type: Number, min: 0, max: 1, default: null },

    isDigitallySigned: { type: Boolean, default: false },
    formatCheckPassed: { type: Boolean, default: null },

    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "MISMATCH", "UNREADABLE"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);