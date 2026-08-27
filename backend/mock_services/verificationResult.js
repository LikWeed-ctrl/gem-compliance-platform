/**
 * Standard shape returned by EVERY verification source —
 * real API or simulated mock. This uniformity is what lets
 * the rule engine and scoring engine treat all sources identically,
 * regardless of where the data actually came from.
 */
function buildVerificationResult({
  found,
  status,
  sourceType,       // "LIVE_API" | "SIMULATED" | "DOCUMENT_OCR" | "MANUAL_LIST"
  sourceName,        // e.g. "RapidAPI - GST Return Status", "Mock Udyam Service"
  fields = {},        // normalized key data (name, dates, etc.)
  rawResponse = null, // exact response as received, for audit trail
  error = null,        // populated if the call failed
}) {
  return {
    found,
    status,
    sourceType,
    sourceName,
    fields,
    rawResponse,
    checkedAt: new Date(),
    error,
  };
}

module.exports = { buildVerificationResult };