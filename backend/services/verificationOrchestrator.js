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

const Tender = require("../models/Tender");
const Document = require("../models/Document");
const { runDeterministicRules } = require("./ruleEngine");
const { runSemanticRules } = require("./aiSemanticService");
const { runCrossDocumentVerification } = require("./crossDocumentEngine");
const { verifyDocumentOwnership } = require("./entityIdentityService");
const { verifyInternalConsistency } = require("./internalDocumentConsistencyService");
const { buildRequirementMatrix, evaluateRequirementCoverage } = require("./tenderRequirementCoverageService");

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
  // Delete old registration checks for this seller to avoid duplicates on re-runs
  await ComplianceCheck.deleteMany({
      sellerProfile: sellerProfile._id,
      category: { $ne: "TENDER_SPECIFIC" }
  });

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
 * Orchestrates checking for a full Bid Submission, including re-verifying the seller profile
 * and running the Advanced Tender Document Verification pipeline.
 */
async function runBidSubmissionChecks(bidSubmission, sellerProfile) {
  // Re-verify the seller profile (Registration Checks)
  const isReverification = !!sellerProfile.registrationVerifiedAt;
  const registrationChecks = await runRegistrationChecks(sellerProfile, isReverification);
  
  // Drift Detection
  let driftDetected = false;
  if (isReverification) {
    driftDetected = registrationChecks.some(c => c.result === 'FAIL' && c.category !== 'BLACKLIST_DEBARMENT');
  }

  if (driftDetected) {
     sellerProfile.driftDetected = true;
     sellerProfile.lastDriftCheckAt = new Date();
     await sellerProfile.save();
  }

  const allChecks = [...registrationChecks];

  // Delete old tender-specific checks to avoid duplication
  await ComplianceCheck.deleteMany({
      bidSubmission: bidSubmission._id,
      category: "TENDER_SPECIFIC"
  });

  // Fetch Tender to get requirements
  const tender = await Tender.findOne({ _id: bidSubmission.tender });
  if (!tender) return allChecks; // No tender found, return early

  // Fetch all tender-specific documents for this bid
  const documents = await Document.find({
    bidSubmission: bidSubmission._id,
    documentCategory: "TENDER_SPECIFIC"
  });

  // Missing documents handled by Tender Requirement Coverage layer.

  
    // Build requirement matrix
    const requirementMatrix = buildRequirementMatrix(tender);
    const allDeterministicResults = [];
    const allSemanticResults = [];

    const tenderContext = {
      tenderNumber: tender.tenderId,
      workDescription: tender.title,
      requiredProduct: tender.title // Can be extracted from rules later
  };

  // Run Layer B and Layer C on each document
  for (const doc of documents) {
      // Find requirements for this specific doc type
      // Requirements should be structured like { "documentType": "...", "requirements": [...] }
      const docRulesObj = (tender.documentRequirements || []).find(r => r.documentType === doc.docType) || { requirements: [] };
      let requirements = docRulesObj.requirements ? JSON.parse(JSON.stringify(docRulesObj.requirements)) : [];

      // DYNAMICALLY OVERRIDE HARDCODED VALUES WITH TENDER ELIGIBILITY RULES
      if (doc.docType === "EXPERIENCE_CRITERIA") {
          // Changed from MIN_COMPLETED_VALUE to MIN_DURATION_YEARS per Task 6
          let req = requirements.find(r => r.rule === "MIN_COMPLETED_VALUE" || r.rule === "MIN_DURATION_YEARS");
          if (!req) { req = { rule: "MIN_DURATION_YEARS" }; requirements.push(req); }
          req.startField = "commencementDate";
          req.endField = "actualCompletionDate";
          req.value = tender.eligibilityRules.minExperienceYears;
      } else if (doc.docType === "PAST_PERFORMANCE") {
          let req = requirements.find(r => r.rule === "MIN_VALUE");
          if (!req) { req = { rule: "MIN_VALUE" }; requirements.push(req); }
          req.targetField = "totalOrderValue";
          req.value = tender.eligibilityRules.pastPerformanceMinValueLakhs;
      } else if (doc.docType === "MII_CERTIFICATE" || doc.docType === "MII_DECLARATION") {
          let req = requirements.find(r => r.rule === "MIN_PERCENT");
          if (!req) { req = { rule: "MIN_PERCENT" }; requirements.push(req); }
          req.targetField = "localContentPercent";
          req.value = tender.eligibilityRules.makeInIndiaMinPercent;
      } else if (doc.docType === "BIDDER_TURNOVER" || doc.docType === "OEM_ANNUAL_TURNOVER") {
          let req = requirements.find(r => r.rule === "MIN_VALUE" && r.targetField === "turnoverLakhs");
          if (!req) { req = { rule: "MIN_VALUE", targetField: "turnoverLakhs" }; requirements.push(req); }
          req.value = tender.eligibilityRules.minTurnoverLakhs;
      }

      // Ownership/Identity Check
      const identityResult = verifyDocumentOwnership(doc, sellerProfile);
      const identityChecks = identityResult.status !== "NOT_APPLICABLE" ? [identityResult] : [];

      // Internal Consistency Check
      const internalChecks = verifyInternalConsistency(doc);

      // Layer B: Deterministic Rules
      const deterministicResults = runDeterministicRules(doc.extractedFields || {}, requirements.filter(r => !r.isSemantic && r.rule !== "SIMILAR_WORK_REQUIRED" && r.rule !== "AUTHORIZATION_SCOPE"));
      
      // Layer C: Semantic Rules
      const semanticResults = await runSemanticRules(doc.rawText || JSON.stringify(doc.extractedFields), requirements, tenderContext);

      
      // Tag results with documentType so coverage evaluator can find them
      deterministicResults.forEach(r => r.documentType = doc.docType);
      semanticResults.forEach(r => r.documentType = doc.docType);
      
      allDeterministicResults.push(...deterministicResults);
      allSemanticResults.push(...semanticResults);

      const combinedResults = [...identityChecks, ...internalChecks, ...deterministicResults, ...semanticResults];
      
      // Determine overall document status
      let overallStatus = "PASS";
      if (combinedResults.some(r => r.status === "FAIL")) overallStatus = "FAIL";
      else if (combinedResults.some(r => r.status === "REVIEW" || r.status === "NOT_FOUND")) overallStatus = "REVIEW";
      else if (combinedResults.length === 0) overallStatus = "PASS"; // If no specific rules, but it was extracted

      // Update Document with detailed JSON
      doc.verificationStatus = overallStatus;
      doc.verificationResult = {
          overallStatus,
          checks: combinedResults
      };
      await doc.save();

      // Create a ComplianceCheck summary for this document
      const docCheck = await ComplianceCheck.create({
        sellerProfile: sellerProfile._id,
        bidSubmission: bidSubmission._id,
        category: "TENDER_SPECIFIC",
        result: overallStatus,
        sourceType: "DOCUMENT_OCR",
        sourceName: `Layer B/C: ${doc.docType}`,
        detail: `Verified ${doc.docType}. Status: ${overallStatus}. Evaluated ${combinedResults.length} rules.`,
        rawResponse: combinedResults,
        weight: overallStatus === "FAIL" ? 2.0 : 1.0,
      });
      allChecks.push(docCheck);
  }

  
    // Layer E: Tender Requirement Coverage Evaluator
    const evaluatedMatrix = evaluateRequirementCoverage(requirementMatrix, documents, allDeterministicResults, allSemanticResults);
    
    // Create a ComplianceCheck for the overall coverage
    let missingOrFailed = evaluatedMatrix.filter(r => r.status === "FAIL");
    let reviewReqs = evaluatedMatrix.filter(r => r.status === "REVIEW");
    
    let coverageStatus = "PASS";
    if (missingOrFailed.length > 0) coverageStatus = "FAIL";
    else if (reviewReqs.length > 0) coverageStatus = "REVIEW";

    const passedReqs = evaluatedMatrix.filter(r => r.status === "PASS" || r.status === "NOT_APPLICABLE");
    const coveragePercent = evaluatedMatrix.length > 0 ? Math.round((passedReqs.length / evaluatedMatrix.length) * 100) : 100;

    const coverageCheck = await ComplianceCheck.create({
        sellerProfile: sellerProfile._id,
        bidSubmission: bidSubmission._id,
        category: "TENDER_SPECIFIC",
        result: coverageStatus,
        sourceType: "SIMULATED",
        sourceName: "Tender Requirement Coverage",
        detail: `Coverage: ${coveragePercent}%. Evaluated ${evaluatedMatrix.length} configured requirements.`,
        rawResponse: evaluatedMatrix,
        weight: coverageStatus === "FAIL" ? 3.0 : 1.0,
    });
    allChecks.push(coverageCheck);

    // Layer D: Cross-Document Verification
  const crossDocResults = runCrossDocumentVerification(documents);
  let crossDocOverallStatus = "PASS";
  if (crossDocResults.some(r => r.status === "FAIL")) crossDocOverallStatus = "FAIL";
  else if (crossDocResults.some(r => r.status === "REVIEW")) crossDocOverallStatus = "REVIEW";

  if (crossDocResults.length > 0) {
      const crossDocCheck = await ComplianceCheck.create({
        sellerProfile: sellerProfile._id,
        bidSubmission: bidSubmission._id,
        category: "TENDER_SPECIFIC",
        result: crossDocOverallStatus,
        sourceType: "SIMULATED", // Using rules
        sourceName: "Cross-Document Engine",
        detail: `Cross-Document Check: ${crossDocOverallStatus}. Flagged ${crossDocResults.filter(r=>r.status!=='PASS').length} inconsistencies.`,
        rawResponse: crossDocResults, // Store detailed JSON in rawResponse
        weight: crossDocOverallStatus === "FAIL" ? 2.0 : 1.0,
      });
      allChecks.push(crossDocCheck);
  }

  // Final Officer Summary Log
  await AuditLog.create({
    sellerProfile: sellerProfile._id,
    bidSubmission: bidSubmission._id,
    tender: tender._id,
    actionType: "COMPLIANCE_CHECK_RUN",
    actor: "system",
    actorRole: "SYSTEM",
    description: `Ran Advanced Tender Verification (Layers A/B/C/D) on ${documents.length} documents.`,
  });

  return allChecks;
}

module.exports = { runRegistrationChecks, runBidSubmissionChecks };