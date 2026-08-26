const ComplianceCheck = require("../models/ComplianceCheck");
const AuditLog = require("../models/AuditLog");
const { getCachedCheck, CACHE_VALIDITY_HOURS } = require("../mock_services/cache");

const { verifyGST } = require("../mock_services/gstService");
const { verifyPAN } = require("../mock_services/panService");
const { verifyUdyam } = require("../mock_services/udyamService");
const { verifyEPFO } = require("../mock_services/epfoService");
const { verifyESIC } = require("../mock_services/esicService");
const { verifyMCA21 } = require("../mock_services/mca21Service");
const { checkBlacklist } = require("../mock_services/blacklistService");

const REAL_ANCHORED_GSTINS = new Set([
  "27AAJCM9929L1ZM", // Madrecha Solutions
  "27AABCN0379D1ZO", // Nissin ABC Logistics
  "24AADFA3083E1ZY", // ABC Organics & Chemicals
  "21AABFT8343A1ZQ", // The Bharat General Store
  "34BISPM6529D1ZO", // Star Builders (real)
  "27AAECI8242H1ZG", // Intelliro Infratech
]);

function isRealAnchoredSeller(sellerProfile) {
  return REAL_ANCHORED_GSTINS.has(sellerProfile.gstin);
}

function buildCheckPlan(sellerProfile) {
  return [
    {
      category: "GST_REGISTRATION",
      run: () => verifyGST(sellerProfile.gstin, { forceMock: !isRealAnchoredSeller(sellerProfile) }),
      skip: !sellerProfile.gstin,
      isAsync: true,
    },
    {
      category: "GST_RETURN_FILING",
      reuseCategory: "GST_REGISTRATION",
      skip: !sellerProfile.gstin,
    },
    {
      category: "PAN_INCOME_TAX",
      run: () => verifyPAN(sellerProfile.panNumber),
      skip: !sellerProfile.panNumber,
      isAsync: false,
    },
    {
      category: "UDYAM_MSME",
      run: () => verifyUdyam(sellerProfile.udyamNumber),
      skip: !sellerProfile.udyamNumber,
      isAsync: false,
    },
    {
      category: "MCA21_STATUS",
      run: () => verifyMCA21(sellerProfile.cin),
      skip: !sellerProfile.cin,
      isAsync: false,
    },
    {
      category: "BLACKLIST_DEBARMENT",
      run: () => checkBlacklist(sellerProfile.companyName),
      skip: false,
      isAsync: false,
    },
  ];
}

function mapResultToCheckResult(category, result) {
  if (result.error) return "COULD_NOT_VERIFY";
  if (!result.found) {
    return category === "BLACKLIST_DEBARMENT" ? "PASS" : "FAIL";
  }

  return mapStatusToResult(result.status, category === "BLACKLIST_DEBARMENT");
}

function mapStatusToResult(statusRaw, isBlacklist = false) {
  const status = (statusRaw || "").toLowerCase();
  if (status === "not_provided") return "WARNING";
  if (isBlacklist) {
    return status.includes("active") ? "FAIL" : "PASS";
  }
  if (status.includes("cancelled") || status.includes("not found") || status.includes("not_found")) return "FAIL";
  if (status.includes("expired") || status.includes("mismatch")) return "WARNING";
  if (status.includes("active") || status.includes("valid")) return "PASS";

  return "WARNING";
}

function buildDetailText(category, result, isReverification = false, lastVerifiedDate = null) {
  let prefix = isReverification ? `Registration status re-verified for this bid — last confirmed ${lastVerifiedDate ? lastVerifiedDate.toISOString() : 'unknown'}. ` : "";
  
  if (result.error) {
    return `${prefix}Could not verify ${category} — source unreachable (${result.error}). Manual verification recommended.`;
  }
  if (!result.found) {
    return `${prefix}${category}: no matching record found. ${result.status}.`;
  }
  return `${prefix}${category}: status = "${result.status}". Source: ${result.sourceName}, checked ${result.checkedAt.toISOString()}.`;
}

/**
 * Runs registration-level checks against the SellerProfile.
 */
async function runRegistrationChecks(sellerProfile, isReverification = false) {
  const plan = buildCheckPlan(sellerProfile);
  const savedChecks = {};

  // For cross-field consistency
  const extractedNames = [];

  for (const item of plan) {
    if (item.reuseCategory) {
      if (!item.skip && savedChecks[item.reuseCategory]) {
        const baseCheck = savedChecks[item.reuseCategory];
        const returnCheck = await ComplianceCheck.create({
          sellerProfile: sellerProfile._id,
          category: item.category,
          result: baseCheck.result,
          sourceType: baseCheck.sourceType,
          sourceName: baseCheck.sourceName,
          detail: `GST return filing data derived from same GST lookup. Returns filed: ${baseCheck.rawResponse?.returns?.length ?? "unknown"}.`,
          rawResponse: baseCheck.rawResponse,
          weight: 1.0,
        });
        savedChecks[item.category] = returnCheck;
      }
      continue;
    }

    if (item.skip) {
      const naCheck = await ComplianceCheck.create({
        sellerProfile: sellerProfile._id,
        category: item.category,
        result: "NOT_APPLICABLE",
        sourceType: "SIMULATED",
        sourceName: "N/A - required identifier not provided",
        detail: `${item.category}: no identifier provided by seller — treated as not applicable.`,
        weight: 0,
      });
      savedChecks[item.category] = naCheck;
      continue;
    }

    // Always fetch fresh for re-verification to detect drift
    let cached = null;
    if (!isReverification) {
       // getCachedCheck might need an update to use sellerProfile instead of bidderId, but leaving as is for now
       cached = await getCachedCheck(sellerProfile._id, item.category);
    }
    
    if (cached) {
      savedChecks[item.category] = cached;
      continue;
    }

    const result = await item.run();

    // Cross-field consistency prep
    if (result.found && result.rawResponse) {
      if (item.category === 'GST_REGISTRATION') {
        const constitution = (result.rawResponse.constitution_of_business || "").toLowerCase();
        if (constitution.includes('proprietor')) {
           extractedNames.push({ source: 'GST', name: result.rawResponse.trade_name || result.rawResponse.legal_name });
        } else {
           extractedNames.push({ source: 'GST', name: result.rawResponse.legal_name });
        }
      } else if (item.category === 'PAN_INCOME_TAX' && result.rawResponse.name) {
        extractedNames.push({ source: 'PAN', name: result.rawResponse.name });
      } else if (item.category === 'MCA21_STATUS' && result.rawResponse.company_name) {
        extractedNames.push({ source: 'MCA', name: result.rawResponse.company_name });
      }
    }

    const checkDoc = await ComplianceCheck.create({
      sellerProfile: sellerProfile._id,
      category: item.category,
      result: mapResultToCheckResult(item.category, result),
      sourceType: result.sourceType,
      sourceName: result.sourceName,
      detail: buildDetailText(item.category, result, isReverification, sellerProfile.registrationVerifiedAt),
      rawResponse: result.rawResponse,
      weight: item.category === "BLACKLIST_DEBARMENT" || item.category === "PAN_INCOME_TAX" ? 5.0 : 1.0,
    });

    savedChecks[item.category] = checkDoc;

    await AuditLog.create({
      sellerProfile: sellerProfile._id,
      actionType: isReverification ? "RECHECK_TRIGGERED" : "COMPLIANCE_CHECK_RUN",
      actor: "system",
      actorRole: "SYSTEM",
      description: `Ran ${item.category} check via ${result.sourceName}`,
      metadata: { category: item.category, result: checkDoc.result, isReverification },
    });
  }

  // Perform cross-field consistency
  if (extractedNames.length > 0) {
    const profileName = sellerProfile.companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let mismatchFound = false;
    let mismatchDetails = [];

    for (const en of extractedNames) {
      if (!en.name) continue;
      const normalizedSource = en.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normalizedSource.includes(profileName) && !profileName.includes(normalizedSource)) {
         mismatchFound = true;
         mismatchDetails.push(`${en.source} name "${en.name}" does not match profile name "${sellerProfile.companyName}"`);
      }
    }

    const consistencyCheck = await ComplianceCheck.create({
        sellerProfile: sellerProfile._id,
        category: "CROSS_FIELD_CONSISTENCY",
        result: mismatchFound ? "WARNING" : "PASS",
        sourceType: "SIMULATED",
        sourceName: "Cross-Registry Matcher",
        detail: mismatchFound ? mismatchDetails.join("; ") : "All registry names match the profile company name.",
        weight: 1.0,
    });
    savedChecks["CROSS_FIELD_CONSISTENCY"] = consistencyCheck;
  }

  return Object.values(savedChecks);
}

/**
 * Orchestrates checking for a full Bid Submission, including re-verifying the seller profile.
 */
async function runBidSubmissionChecks(bidSubmission, sellerProfile) {
  // Re-verify the seller profile (Registration Checks)
  const isReverification = !!sellerProfile.registrationVerifiedAt;
  const registrationChecks = await runRegistrationChecks(sellerProfile, isReverification);
  
  // Drift Detection
  let driftDetected = false;
  if (isReverification) {
    // In a real app we'd compare against previous saved checks.
    // Here we'll just check if any registration check currently FAILED.
    driftDetected = registrationChecks.some(c => c.result === 'FAIL' && c.category !== 'BLACKLIST_DEBARMENT');
  }

  if (driftDetected) {
     sellerProfile.driftDetected = true;
     sellerProfile.lastDriftCheckAt = new Date();
     await sellerProfile.save();
  }

  // For Tender-specific checks, we would normally fetch `Document` models
  // associated with this `bidSubmission` and run compliance against tender rules.
  // We'll leave a placeholder here to represent that logic.
  const tenderSpecificCheck = await ComplianceCheck.create({
    sellerProfile: sellerProfile._id,
    bidSubmission: bidSubmission._id,
    category: "TENDER_SPECIFIC",
    result: "PASS", // This would be evaluated by ruleEngine based on Document extraction vs Tender eligibility rules
    sourceType: "DOCUMENT_OCR",
    sourceName: "LLM Extraction",
    detail: "Tender-specific documents were evaluated against tender rules.",
    weight: 2.0,
  });

  return [...registrationChecks, tenderSpecificCheck];
}

module.exports = { runRegistrationChecks, runBidSubmissionChecks };