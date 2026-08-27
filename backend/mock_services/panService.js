const axios = require("axios");
const { mockRegistryCheck } = require("./registryMock");
const { getMode } = require("../config/dataSourceConfig");
const { buildVerificationResult } = require("./verificationResult");

/**
 * REAL path — genuinely wired to make a live HTTP call. Currently
 * inactive because PAN_API_URL/PAN_API_KEY are empty in .env, and
 * DATA_SOURCE_MODE.PAN is set to "mock". To go live: fill in the
 * two env vars, adjust the field-normalization block below to match
 * your chosen vendor's actual response shape, then flip PAN to "real".
 */
async function verifyPanReal(panNumber) {
  const url = process.env.PAN_API_URL;
  const apiKey = process.env.PAN_API_KEY;

  if (!url || !apiKey) {
    console.warn("PAN set to 'real' mode but PAN_API_URL/PAN_API_KEY are not configured. Falling back to mock.");
    return verifyPanMock(panNumber);
  }

  try {
    const response = await axios.get(`${url}/${panNumber}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });
    const data = response.data;

    // ADJUST these field names once a real vendor response shape is known —
    // this is a reasonable default guess based on common KYC vendor formats.
    return buildVerificationResult({
      found: !!data.name,
      status: data.status || "UNKNOWN",
      sourceType: "LIVE_API",
      sourceName: "Real PAN Verification API",
      fields: { name: data.name, pan: panNumber },
      rawResponse: data,
    });
  } catch (error) {
    return buildVerificationResult({
      found: false,
      status: "COULD_NOT_VERIFY",
      sourceType: "LIVE_API",
      sourceName: "Real PAN Verification API",
      error: error.message,
    });
  }
}

function verifyPanMock(panNumber, companyScenario) {
  return mockRegistryCheck({
    registryFile: "pan_registry.json",
    idValue: panNumber,
    nameField: "name",
    sourceName: "Mock PAN/Income-Tax Registry (no public API exists)",
    companyScenario,
    defaultStatus: "Valid - Active",
  });
}
async function verifyPAN(panNumber, companyScenario) {
  const mode = getMode("PAN");
  if (mode === "real") {
    return await verifyPanReal(panNumber);
  }
  return verifyPanMock(panNumber, companyScenario);
}

module.exports = { verifyPAN };