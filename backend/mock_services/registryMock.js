const { findCompanyByField } = require("./dataLoader");
const { buildVerificationResult } = require("./verificationResult");
const fs = require("fs");
const path = require("path");

const registryCache = {};

function loadRegistry(filename) {
  if (!registryCache[filename]) {
    const filePath = path.join(__dirname, "synthetic_data", filename);
    registryCache[filename] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return registryCache[filename];
}

/**
 * Generic mock verifier for registry-style sources (Udyam, EPFO, ESIC,
 * MCA21, PAN) that have no accessible free API. Looks up the ID directly
 * in that source's own registry file, returning whatever name THAT
 * source has on file — this is what enables genuine cross-field
 * consistency checking downstream (comparing independently-sourced
 * names against each other), rather than trusting one bundled record.
 */
function mockRegistryCheck({
  registryFile,      // e.g. "pan_registry.json"
  idValue,            // the ID to look up
  nameField,          // which field in that registry holds the name: "name" | "employerName" | "companyName"
  sourceName,
  scenarioRules = {},  // optional overrides keyed by companies.json `scenario` tag
  companyScenario,     // the calling company's scenario tag, if relevant
  defaultStatus = "Active",
}) {
  if (!idValue) {
    return buildVerificationResult({
      found: false,
      status: "NOT_PROVIDED",
      sourceType: "SIMULATED",
      sourceName,
    });
  }

  const registry = loadRegistry(registryFile);
  const record = registry[idValue];

  if (!record) {
    return buildVerificationResult({
      found: false,
      status: "NOT_FOUND",
      sourceType: "SIMULATED",
      sourceName,
      rawResponse: { queriedValue: idValue },
    });
  }

  const scenarioOverride = scenarioRules[companyScenario];
  const status = scenarioOverride?.status || record.status || defaultStatus;
  const sourceName_ = record[nameField];

  return buildVerificationResult({
    found: true,
    status,
    sourceType: "SIMULATED",
    sourceName,
    fields: {
      [nameField]: sourceName_,
      idValue,
    },
    rawResponse: record,
  });
}

module.exports = { mockRegistryCheck };