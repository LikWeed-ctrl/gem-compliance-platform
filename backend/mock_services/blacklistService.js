const axios = require("axios");
const { loadBlacklist } = require("./dataLoader");
const { buildVerificationResult } = require("./verificationResult");
const { getMode } = require("../config/dataSourceConfig");

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\b(pvt|private|ltd|limited|llp|inc|co|m\/s)\b\.?/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function checkBlacklistReal(companyName) {
  const url = process.env.BLACKLIST_API_URL;
  const apiKey = process.env.BLACKLIST_API_KEY;

  if (!url || !apiKey) {
    console.warn("BLACKLIST set to 'real' mode but BLACKLIST_API_URL/BLACKLIST_API_KEY are not configured. Falling back to mock.");
    return checkBlacklistMock(companyName);
  }

  try {
    const response = await axios.get(`${url}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      params: { name: companyName },
      timeout: 10000,
    });
    const data = response.data;

    return buildVerificationResult({
      found: !!data.matched,
      status: data.status || "UNKNOWN",
      sourceType: "LIVE_API",
      sourceName: "Real GeM/CPPP Debarment API",
      fields: { companyName },
      rawResponse: data,
    });
  } catch (error) {
    return buildVerificationResult({
      found: false,
      status: "COULD_NOT_VERIFY",
      sourceType: "LIVE_API",
      sourceName: "Real GeM/CPPP Debarment API",
      error: error.message,
    });
  }
}

function checkBlacklistMock(companyName) {
  const registry = loadBlacklist();
  const normalizedInput = normalizeName(companyName);

  const match = registry.find(
    (entry) => normalizeName(entry.bidder_name) === normalizedInput
  );

  if (!match) {
    return buildVerificationResult({
      found: false,
      status: "NOT_BLACKLISTED",
      sourceType: "MANUAL_LIST",
      sourceName: "GeM/CPPP Debarment Registry (real public data, local lookup — no query API exists)",
      fields: { companyName },
    });
  }

  const now = new Date();
  const endDate = new Date(match.end_date);
  const isCurrentlyActive = endDate >= now;

  return buildVerificationResult({
    found: true,
    status: isCurrentlyActive ? "BLACKLISTED - ACTIVE" : "BLACKLISTED - EXPIRED",
    sourceType: "MANUAL_LIST",
    sourceName: "GeM/CPPP Debarment Registry (real public data, local lookup — no query API exists)",
    fields: {
      companyName,
      matchedEntity: match.bidder_name,
      blockStartDate: match.start_date,
      blockEndDate: match.end_date,
      blockingOrganisation: match.organisation || match.tender_category,
    },
    rawResponse: match,
  });
}

async function checkBlacklist(companyName) {
  const mode = getMode("BLACKLIST");
  if (mode === "real") {
    return await checkBlacklistReal(companyName);
  }
  return checkBlacklistMock(companyName);
}

module.exports = { checkBlacklist };