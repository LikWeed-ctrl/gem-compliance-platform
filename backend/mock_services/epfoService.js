const axios = require("axios");
const { mockRegistryCheck } = require("./registryMock");
const { getMode } = require("../config/dataSourceConfig");
const { buildVerificationResult } = require("./verificationResult");

async function verifyEpfoReal(establishmentId) {
  const url = process.env.EPFO_API_URL;
  const apiKey = process.env.EPFO_API_KEY;

  if (!url || !apiKey) {
    console.warn("EPFO set to 'real' mode but EPFO_API_URL/EPFO_API_KEY are not configured. Falling back to mock.");
    return verifyEpfoMock(establishmentId);
  }

  try {
    const response = await axios.get(`${url}/${establishmentId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });
    const data = response.data;

    return buildVerificationResult({
      found: !!data.employerName,
      status: data.status || "UNKNOWN",
      sourceType: "LIVE_API",
      sourceName: "Real EPFO Verification API",
      fields: { employerName: data.employerName, establishmentId },
      rawResponse: data,
    });
  } catch (error) {
    return buildVerificationResult({
      found: false,
      status: "COULD_NOT_VERIFY",
      sourceType: "LIVE_API",
      sourceName: "Real EPFO Verification API",
      error: error.message,
    });
  }
}

function verifyEpfoMock(establishmentId, companyScenario) {
  return mockRegistryCheck({
    registryFile: "epfo_registry.json",
    idValue: establishmentId,
    nameField: "employerName",
    sourceName: "Mock EPFO Registry (real APIs exist but require business KYC)",
    companyScenario,
    defaultStatus: "Active - Contributions Current",
  });
}

async function verifyEPFO(establishmentId, companyScenario) {
  const mode = getMode("EPFO");
  if (mode === "real") {
    return await verifyEpfoReal(establishmentId);
  }
  return verifyEpfoMock(establishmentId, companyScenario);
}

module.exports = { verifyEPFO };