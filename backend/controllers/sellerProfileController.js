const SellerProfile = require("../models/SellerProfile");
const { runRegistrationChecks } = require("../services/verificationOrchestrator");

async function registerSellerProfile(req, res) {
  try {
    const data = req.body;
    
    // Check if PAN already exists
    const existing = await SellerProfile.findOne({ panNumber: data.panNumber });
    if (existing) {
      return res.status(400).json({ error: "Seller Profile with this PAN already exists." });
    }

    const sellerProfile = await SellerProfile.create(data);

    // Run verification immediately
    const checks = await runRegistrationChecks(sellerProfile, false);
    
    // Mark as verified
    sellerProfile.registrationVerifiedAt = new Date();
    await sellerProfile.save();

    res.status(201).json({ sellerProfile, checks });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function loginSellerProfile(req, res) {
  try {
    const { panNumber } = req.body;
    if (!panNumber) return res.status(400).json({ error: "PAN Number is required for login." });

    const sellerProfile = await SellerProfile.findOne({ panNumber: panNumber.toUpperCase() });
    if (!sellerProfile) {
      return res.status(404).json({ error: "Seller Profile not found for this PAN." });
    }

    res.json({ sellerProfile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  registerSellerProfile,
  loginSellerProfile
};
