const ComplianceCheck = require("../models/ComplianceCheck");

const CACHE_VALIDITY_HOURS = 24; // a GST check today is still valid tomorrow morning

/**
 * Look for an existing compliance check for this bidder+category
 * that's recent enough to reuse — avoids burning limited API calls
 * (RapidAPI free tier: 10-20 requests/day) on redundant re-checks
 * during development, testing, or repeated demo runs.
 */
async function getCachedCheck(bidderId, category) {
  const cutoff = new Date(Date.now() - CACHE_VALIDITY_HOURS * 60 * 60 * 1000);

  const existing = await ComplianceCheck.findOne({
    bidder: bidderId,
    category: category,
    checkedAt: { $gte: cutoff },
  }).sort({ checkedAt: -1 }); // most recent first

  return existing; // null if nothing found
}

module.exports = { getCachedCheck, CACHE_VALIDITY_HOURS };