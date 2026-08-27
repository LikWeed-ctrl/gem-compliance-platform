const axios = require("axios");
const { mockRegistryCheck } = require("./registryMock");
const { getMode } = require("../config/dataSourceConfig");
const { buildVerificationResult } = require("./verificationResult");

async function verifyUdyamReal(udyamNumber) {
  const url = process.env.UDYAM_API_URL;
  const apiKey = process.env.UDYAM_API_KEY;

  if (!url || !apiKey) {
    console.warn("UDYAM set to 'real' mode but UDYAM_API_URL/UDYAM_API_KEY are not configured. Falling back to mock.");
    return verifyUdyamMock(udyamNumber);
  }

  try {
    const response = await axios.get(`${url}/${udyamNumber}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });
    const data = response.data;

    return buildVerificationResult({
      found: !!data.name,
      status: data.status || "UNKNOWN",
      sourceType: "LIVE_API",
      sourceName: "Real Udyam Verification API",
      fields: { name: data.name, udyamNumber },
      rawResponse: data,
    });
  } catch (error) {
    return buildVerificationResult({
      found: false,
      status: "COULD_NOT_VERIFY",
      sourceType: "LIVE_API",
      sourceName: "Real Udyam Verification API",
      error: error.message,
    });
  }
}

function verifyUdyamMock(udyamNumber, companyScenario) {
  return mockRegistryCheck({
    registryFile: "udyam_registry.json",
    idValue: udyamNumber,
    nameField: "name",
    sourceName: "Mock Udyam Registry (no public API — manual portal only)",
    companyScenario,
    defaultStatus: "Active",
  });
}

async function verifyUdyam(udyamNumber, companyScenario) {
  const mode = getMode("UDYAM");
  if (mode === "real") {
    return await verifyUdyamReal(udyamNumber);
  }
  return verifyUdyamMock(udyamNumber, companyScenario);
}

module.exports = { verifyUdyam };