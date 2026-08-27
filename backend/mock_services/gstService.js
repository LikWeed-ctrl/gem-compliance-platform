const axios = require("axios");
const { buildVerificationResult } = require("./verificationResult");
const { getMode } = require("../config/dataSourceConfig");
const { mockRegistryCheck } = require("./registryMock"); 
/**
 * REAL integration — calls RapidAPI's GST Return Status API.
 * Source: gst-return-status.p.rapidapi.com (adarshmadrecha)
 * Free tier: 10-20 requests/day — caller MUST cache results,
 * do NOT call this repeatedly for the same GSTIN in one session.
 */





async function verifyGstReal(gstin)  {
  const url = `https://${process.env.RAPIDAPI_GST_HOST}/free/gstin/${gstin}`;

  const options = {
    method: "GET",
    url,
    headers: {
      "x-rapidapi-key": process.env.RAPIDAPI_KEY,
      "x-rapidapi-host": process.env.RAPIDAPI_GST_HOST,
    },
    timeout: 10000,
  };

  try {
    const response = await axios.request(options);
    const payload = response.data;

    if (!payload.success || !payload.data) {
      return buildVerificationResult({
        found: false,
        status: "NOT_FOUND",
        sourceType: "LIVE_API",
        sourceName: "RapidAPI - GST Return Status",
        rawResponse: payload,
      });
    }

    const data = payload.data;

    // normalize the messy real-world field names into clean fields
    // our rule engine can rely on consistently
    const normalizedFields = {
      gstin: data.gstin,
      legalName: data.lgnm,
      tradeName: data.tradeName,
      pan: data.pan,
      constitutionOfBusiness: data.ctb,
      registrationDate: data.rgdt,
      address: data.adr,
      latestGstr1Period: data.meta?.latestgtsr1 || null,
      latestGstr3bPeriod: data.meta?.latestgtsr3b || null,
      returnsFiledCount: (data.returns || []).length,
    };

    return buildVerificationResult({
      found: true,
      status: data.sts || "UNKNOWN", // "Active" / "Cancelled" etc.
      sourceType: "LIVE_API",
      sourceName: "RapidAPI - GST Return Status",
      fields: normalizedFields,
      rawResponse: data,
    });
  } catch (error) {
    // API failed/unreachable — degrade gracefully, don't crash the pipeline
    return buildVerificationResult({
      found: false,
      status: "COULD_NOT_VERIFY",
      sourceType: "LIVE_API",
      sourceName: "RapidAPI - GST Return Status",
      error: error.message,
    });
  }
}

function verifyGstMock(gstin, companyScenario) {
  return mockRegistryCheck({
    registryFile: "gst_registry.json",
    idValue: gstin,
    nameField: "legalName",
    sourceName: "Mock GST Registry (synthetic bidder — not a real GSTIN)",
    companyScenario,
    scenarioRules: {
      gst_returns_lapsed: { status: "Active - Returns Lapsed" },
      gst_cancelled: { status: "Cancelled" },
    },
    defaultStatus: "Active",
  });
}

/**
 * @param {string} gstin
 * @param {object} options
 * @param {boolean} [options.forceMock] - if true, always use mock regardless
 *   of global config. Used for bidders whose GSTIN is synthetic/fabricated
 *   and would otherwise waste a real API call or return a false NOT_FOUND.
 */
async function verifyGST(gstin, options = {}) {
  const mode = getMode("GST");

  if (options.forceMock || mode === "mock") {
    return verifyGstMock(gstin, options.companyScenario);
  }
  return await verifyGstReal(gstin);
}
module.exports = { verifyGST };