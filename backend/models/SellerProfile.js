const mongoose = require('mongoose');

const sellerProfileSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },

    // --- Personal Details (from GeM registration screen) ---
    aadhaarOrPanVerified: { type: Boolean, default: false }, // Aadhaar/Virtual ID OR Personal PAN + mobile
    emailVerified: { type: Boolean, default: false },

    // --- Business Details (required at registration) ---
    panNumber: { type: String, required: true, index: true }, // 4th char must be 'C' for company PAN
    cin: { type: String, default: null, index: true }, // Company Identification Number
    bankAccountNumber: { type: String, default: null },
    ifscCode: { type: String, default: null },
    businessAgeMonths: { type: Number, default: null }, // determines if ITR is required
    itrLast3Years: [{ type: String }], // file paths/refs, only required if businessAgeMonths > 24
    registeredAddress: { type: String, default: null },

    // --- Optional at registration, but affects EMD exemption eligibility ---
    udyamNumber: { type: String, default: null, index: true }, // MSME EMD exemption
    dippStartupNumber: { type: String, default: null, index: true }, // Startup EMD exemption
    gstin: { type: String, default: null, index: true }, // ONLY required if inter-state business

    // --- Registration-level verification results (drift-checkable) ---
    registrationVerifiedAt: { type: Date, default: null }, // when first verified at signup
    lastDriftCheckAt: { type: Date, default: null }, // most recent re-verification
    driftDetected: { type: Boolean, default: false }, // true if status degraded since registrationVerifiedAt
    
    // --- Legacy / Extra Fields ---
    epfoEstablishmentId: { type: String, default: null },
    esicNumber: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SellerProfile', sellerProfileSchema);
