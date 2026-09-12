/** /
 * Central switch: declares whether each verification category currently
 * uses MOCK (reference/simulated data) or REAL (live external API).
 *
 * To go live with a new real integration later: implement the real-fetch
 * function in that category's service file, then flip this flag to "real".
 * No other file needs to change — every service checks this config,
 * not a hardcoded assumption.
 */
const DATA_SOURCE_MODE = {
  PAN: "mock",
  GST: "mock",         // the one live external API call, via RapidAPI
  UDYAM: "mock",
  EPFO: "mock",
  ESIC: "mock",
  MCA21: "mock",
  BLACKLIST: "mock",    // static local lookup, not a live API call —
                         // but the underlying data is genuine public GeM/CPPP
                         // debarment records, not fabricated. See blacklistService.js.
};

function getMode(category) {
  return DATA_SOURCE_MODE[category] || "mock";
}

module.exports = { DATA_SOURCE_MODE, getMode };