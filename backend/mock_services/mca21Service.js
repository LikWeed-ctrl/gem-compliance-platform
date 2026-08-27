const axios = require("axios");
const { mockRegistryCheck } = require("./registryMock");
const { getMode } = require("../config/dataSourceConfig");
const { buildVerificationResult } = require("./verificationResult");

async function verifyMca21Real(cin) {
  const url = process.env.MCA21_API_URL;
  const apiKey = process.env.MCA21_API_KEY;

  if (!url || !apiKey) {
    console.warn("MCA21 set to 'real' mode but MCA21_API_URL/MCA21_API_KEY are not configured. Falling back to mock.");
    return verifyMca21Mock(cin);
  }

  try {
    const response = await axios.get(`${url}/${cin}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });
    const data = response.data;

    return buildVerificationResult({
      found: !!data.companyName,
      status: data.status || "UNKNOWN",
      sourceType: "LIVE_API",
      sourceName: "Real MCA21 Verification API",
      fields: { companyName: data.companyName, cin },
      rawResponse: data,
    });
  } catch (error) {
    return buildVerificationResult({
      found: false,
      status: "COULD_NOT_VERIFY",
      sourceType: "LIVE_API",
      sourceName: "Real MCA21 Verification API",
      error: error.message,
    });
  }
}

function verifyMca21Mock(cin, companyScenario) {
  return mockRegistryCheck({
    registryFile: "mca21_registry.json",
    idValue: cin,
    nameField: "companyName",
    sourceName: "Mock MCA21 Registry (real sandbox needs business KYC — Surepass/Decentro)",
    companyScenario,
    defaultStatus: "Active",
  });
}

async function verifyMCA21(cin, companyScenario) {
  const mode = getMode("MCA21");
  if (mode === "real") {
    return await verifyMca21Real(cin);
  }
  return verifyMca21Mock(cin, companyScenario);
}

module.exports = { verifyMCA21 };