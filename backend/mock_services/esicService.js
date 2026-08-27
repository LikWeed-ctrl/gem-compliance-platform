const axios = require("axios");
const { mockRegistryCheck } = require("./registryMock");
const { getMode } = require("../config/dataSourceConfig");
const { buildVerificationResult } = require("./verificationResult");

async function verifyEsicReal(esicNumber) {
  const url = process.env.ESIC_API_URL;
  const apiKey = process.env.ESIC_API_KEY;

  if (!url || !apiKey) {
    console.warn("ESIC set to 'real' mode but ESIC_API_URL/ESIC_API_KEY are not configured. Falling back to mock.");
    return verifyEsicMock(esicNumber);
  }

  try {
    const response = await axios.get(`${url}/${esicNumber}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });
    const data = response.data;

    return buildVerificationResult({
      found: !!data.employerName,
      status: data.status || "UNKNOWN",
      sourceType: "LIVE_API",
      sourceName: "Real ESIC Verification API",
      fields: { employerName: data.employerName, esicNumber },
      rawResponse: data,
    });
  } catch (error) {
    return buildVerificationResult({
      found: false,
      status: "COULD_NOT_VERIFY",
      sourceType: "LIVE_API",
      sourceName: "Real ESIC Verification API",
      error: error.message,
    });
  }
}

function verifyEsicMock(esicNumber, companyScenario) {
  return mockRegistryCheck({
    registryFile: "esic_registry.json",
    idValue: esicNumber,
    nameField: "employerName",
    sourceName: "Mock ESIC Registry (bundled paid tier only, no free API)",
    companyScenario,
    defaultStatus: "Active",
  });
}

async function verifyESIC(esicNumber, companyScenario) {
  const mode = getMode("ESIC");
  if (mode === "real") {
    return await verifyEsicReal(esicNumber);
  }
  return verifyEsicMock(esicNumber, companyScenario);
}

module.exports = { verifyESIC };