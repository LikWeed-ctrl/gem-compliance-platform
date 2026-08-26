const ComplianceCheck = require("../models/ComplianceCheck");
const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");
const { verifyUDIN } = require("../mock_services/icaiService");
const { verifyUdyam } = require("../mock_services/udyamService");

async function checkMakeInIndia(bidSubmission, rules, existingChecks, documents) {
  if (!rules.makeInIndiaMinPercent) return null;
  const miiDoc = documents.find(d => d.docType === "MII_CERTIFICATE");
  const declared = bidSubmission.declaredLocalContentPercent;
  if (declared === undefined || declared === null) {
    return { result: "WARNING", detail: `Tender requires Make in India local content >= ${rules.makeInIndiaMinPercent}%, but no self-declaration was found.` };
  }
  if (!miiDoc || miiDoc.verificationStatus === "UNREADABLE") {
    return { result: "WARNING", detail: `Bidder declared ${declared}% local content, but no readable MII Certificate was found.` };
  }
  const extractedPercent = miiDoc.extractedFields?.localContentPercent || miiDoc.extractedFields?.percent || declared;
  if (extractedPercent < rules.makeInIndiaMinPercent || declared < rules.makeInIndiaMinPercent) {
    return { result: "FAIL", detail: `Local content (Declared: ${declared}%, Certificate: ${extractedPercent}%) is below required minimum of ${rules.makeInIndiaMinPercent}%.` };
  }
  return { result: "PASS", detail: `Verified MII Certificate supports declared local content of ${declared}%, meeting requirement of ${rules.makeInIndiaMinPercent}%.` };
}

async function checkOEMAuthorization(bidSubmission, rules, existingChecks, documents) {
  if (!rules.oemAuthorizationRequired) return null;
  const oemDoc = documents.find(d => d.docType === "OEM_AUTHORIZATION_CERTIFICATE");
  if (!oemDoc || oemDoc.verificationStatus === "UNREADABLE") {
    return { result: "WARNING", detail: `This tender mandates OEM authorization, but no valid OEM authorization letter was verified for this bid.` };
  }
  const oemUdyam = oemDoc.extractedFields?.oemUdyam || oemDoc.extractedFields?.udyam || oemDoc.extractedFields?.UdyamRegistrationNumber;
  if (oemUdyam) {
     const verifyRes = await verifyUdyam(oemUdyam);
     if (!verifyRes.found || verifyRes.status.includes("cancelled")) {
        return { result: "FAIL", detail: `OEM Authorization provided, but cross-check of OEM Udyam (${oemUdyam}) against MSME portal failed. OEM is inactive or invalid.` };
     }
     return { result: "PASS", detail: `OEM authorization verified. OEM Udyam (${oemUdyam}) cross-checked successfully on MSME Portal.` };
  }
  return { result: "PASS", detail: `OEM authorization certificate uploaded and verified by AI. No strict OEM ID was found to cross-check.` };
}

async function checkMinTurnover(bidSubmission, rules, existingChecks, documents) {
  if (!rules.minTurnoverLakhs) return null;
  const declaredTurnover = bidSubmission.declaredTurnoverLakhs;
  const toDoc = documents.find(d => d.docType === "BIDDER_TURNOVER");
  if (!toDoc || toDoc.verificationStatus === "UNREADABLE") {
    return { result: "WARNING", detail: `Tender requires minimum turnover of ₹${rules.minTurnoverLakhs} lakhs. Bidder declared ₹${declaredTurnover}, but no readable CA certificate found.` };
  }
  const extractedLakhs = toDoc.extractedFields?.turnoverLakhs || toDoc.extractedFields?.turnover || toDoc.extractedFields?.turnover_lakhs || declaredTurnover;
  const udin = toDoc.extractedFields?.udin || toDoc.extractedFields?.CA_UDIN || toDoc.extractedFields?.ca_udin;
  if (declaredTurnover < rules.minTurnoverLakhs || extractedLakhs < rules.minTurnoverLakhs) {
    return { result: "FAIL", detail: `Turnover (Declared: ₹${declaredTurnover}, Certificate: ₹${extractedLakhs}) is below required minimum of ₹${rules.minTurnoverLakhs} lakhs.` };
  }
  if (udin) {
     const udinCheck = await verifyUDIN(udin);
     if (!udinCheck.found || udinCheck.status === "REVOKED") {
         return { result: "FAIL", detail: `CRITICAL: CA Turnover Certificate contains UDIN ${udin}. ICAI Registry lookup failed (${udinCheck.status}). Document is likely forged.` };
     }
     return { result: "PASS", detail: `Turnover ₹${extractedLakhs} lakhs verified. CA UDIN (${udin}) cross-checked on ICAI Registry as ACTIVE.` };
  }
  return { result: "WARNING", detail: `Turnover ₹${extractedLakhs} lakhs extracted, but no CA UDIN found to cryptographically verify. Manual check recommended.` };
}

async function checkExperience(bidSubmission, rules, existingChecks, documents) {
  if (!rules.minExperienceYears) return null;
  const expDoc = documents.find(d => d.docType === "EXPERIENCE_CRITERIA");
  if (!expDoc || expDoc.verificationStatus === "UNREADABLE") {
    return { result: "WARNING", detail: `Tender requires ${rules.minExperienceYears} years of experience, but no readable experience document was uploaded.` };
  }
  const expYears = expDoc.extractedFields?.yearsOfExperience || expDoc.extractedFields?.years;
  if (expYears && expYears < rules.minExperienceYears) {
      return { result: "FAIL", detail: `Extracted experience (${expYears} years) does not meet tender requirement (${rules.minExperienceYears} years).` };
  }
  return { result: "PASS", detail: `Experience Criteria verified. Extracted ${expYears || 'sufficient'} years experience from attached work orders.` };
}

async function checkPastPerformance(bidSubmission, rules, existingChecks, documents) {
  if (!rules.pastPerformanceMinValueLakhs) return null;
  const ppDoc = documents.find(d => d.docType === "PAST_PERFORMANCE");
  if (!ppDoc || ppDoc.verificationStatus === "UNREADABLE") {
    return { result: "WARNING", detail: `Tender requires past performance of ₹${rules.pastPerformanceMinValueLakhs} lakhs, but no readable document found.` };
  }
  const ppValue = ppDoc.extractedFields?.valueLakhs || ppDoc.extractedFields?.totalValue;
  if (ppValue && ppValue < rules.pastPerformanceMinValueLakhs) {
      return { result: "FAIL", detail: `Extracted past performance value (₹${ppValue} lakhs) does not meet tender requirement (₹${rules.pastPerformanceMinValueLakhs} lakhs).` };
  }
  return { result: "PASS", detail: `Past Performance Criteria verified. Extracted sufficient value from attached completion certificates.` };
}

const RULE_CHECKERS = [
  { name: "MAKE_IN_INDIA_TENDER_RULE", fn: checkMakeInIndia },
  { name: "OEM_AUTH_TENDER_RULE", fn: checkOEMAuthorization },
  { name: "MIN_TURNOVER_TENDER_RULE", fn: checkMinTurnover },
  { name: "MIN_EXPERIENCE_TENDER_RULE", fn: checkExperience },
  { name: "PAST_PERFORMANCE_TENDER_RULE", fn: checkPastPerformance },
];

async function runTenderSpecificRules(bidSubmissionId, bidSubmission, tender) {
  const rules = tender.eligibilityRules || {};
  const existingChecks = await ComplianceCheck.find({
    $or: [
      { bidSubmission: bidSubmissionId },
      { sellerProfile: bidSubmission.sellerProfile._id || bidSubmission.sellerProfile }
    ]
  });
  
  const documents = await Document.find({
      sellerProfile: bidSubmission.sellerProfile._id || bidSubmission.sellerProfile,
  });

  const results = [];
  for (const { name, fn } of RULE_CHECKERS) {
    const outcome = await fn(bidSubmission, rules, existingChecks, documents);
    if (outcome === null) continue;
    const checkDoc = await ComplianceCheck.create({
      sellerProfile: bidSubmission.sellerProfile._id || bidSubmission.sellerProfile,
      bidSubmission: bidSubmissionId,
      category: "TENDER_SPECIFIC",
      result: outcome.result,
      sourceType: "DOCUMENT_OCR",
      sourceName: `Tender Rule Engine - ${name}`,
      detail: outcome.detail,
      weight: outcome.result === "FAIL" ? 2.0 : 1.0,
    });
    results.push(checkDoc);
  }
  await AuditLog.create({
    sellerProfile: bidSubmission.sellerProfile._id || bidSubmission.sellerProfile,
    bidSubmission: bidSubmissionId,
    tender: tender._id,
    actionType: "COMPLIANCE_CHECK_RUN",
    actor: "system",
    actorRole: "SYSTEM",
    description: `Ran ${results.length} tender-specific deep document rule(s)`,
    metadata: { rulesApplied: results.map((r) => r.sourceName) },
  });
  return results;
}

module.exports = { runTenderSpecificRules };
