const fs = require("fs");
const path = require("path");

let companiesCache = null;
let blacklistCache = null;

function loadCompanies() {
  if (!companiesCache) {
    const filePath = path.join(__dirname, "synthetic_data", "companies.json");
    companiesCache = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return companiesCache;
}

function loadBlacklist() {
  if (!blacklistCache) {
    const filePath = path.join(__dirname, "synthetic_data", "blacklist_registry.json");
    blacklistCache = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return blacklistCache;
}

function findCompanyByField(fieldName, value) {
  const companies = loadCompanies();
  return companies.find(
    (c) => c[fieldName] && c[fieldName].toLowerCase() === String(value).toLowerCase()
  );
}

module.exports = { loadCompanies, loadBlacklist, findCompanyByField };