const { runDeterministicRules } = require("./ruleEngine");

/**
 * Builds a matrix of all requirements based on Tender configuration.
 */
function buildRequirementMatrix(tender) {
    const requirements = [];

    // 1. Required Documents
    const reqDocs = tender.requiredDocuments || [];
    for (const docType of reqDocs) {
        requirements.push({
            requirementId: `REQ_DOC_${docType}`,
            requirementType: "DOCUMENT_SUBMISSION",
            name: `${docType.replace(/_/g, ' ')} Document Submission`,
            required: true,
            documentType: docType,
            status: "PENDING",
            evidence: null
        });
    }

    // 2. Numeric / Boolean Eligibility Rules
    const er = tender.eligibilityRules || {};
    
    if (er.minExperienceYears) {
        requirements.push({
            requirementId: "REQ_NUM_EXPERIENCE",
            requirementType: "NUMERIC_ELIGIBILITY",
            name: "Minimum Experience Duration",
            required: true,
            threshold: er.minExperienceYears,
            documentType: "EXPERIENCE_CRITERIA",
            targetRule: "MIN_DURATION_YEARS",
            status: "PENDING",
            evidence: null
        });
    }
    
    if (er.pastPerformanceMinValueLakhs) {
        requirements.push({
            requirementId: "REQ_NUM_PAST_PERFORMANCE",
            requirementType: "NUMERIC_ELIGIBILITY",
            name: "Minimum Past Performance Value",
            required: true,
            threshold: er.pastPerformanceMinValueLakhs,
            documentType: "PAST_PERFORMANCE",
            targetRule: "MIN_VALUE",
            status: "PENDING",
            evidence: null
        });
    }
    
    if (er.makeInIndiaMinPercent) {
        requirements.push({
            requirementId: "REQ_NUM_MII_PERCENT",
            requirementType: "NUMERIC_ELIGIBILITY",
            name: "Minimum Local Content Percentage",
            required: true,
            threshold: er.makeInIndiaMinPercent,
            documentType: "MII_CERTIFICATE",
            targetRule: "MIN_PERCENT",
            status: "PENDING",
            evidence: null
        });
    }
    
    if (er.minTurnoverLakhs) {
        requirements.push({
            requirementId: "REQ_NUM_TURNOVER",
            requirementType: "NUMERIC_ELIGIBILITY",
            name: "Minimum Annual Turnover",
            required: true,
            threshold: er.minTurnoverLakhs,
            documentType: "BIDDER_TURNOVER",
            targetRule: "MIN_VALUE",
            status: "PENDING",
            evidence: null
        });
    }

    if (er.oemAuthorizationRequired) {
        if (!reqDocs.includes("OEM_AUTHORIZATION_CERTIFICATE")) {
            requirements.push({
                requirementId: "REQ_BOOL_OEM_AUTH",
                requirementType: "DOCUMENT_SUBMISSION",
                name: "OEM Authorization Required by Eligibility",
                required: true,
                documentType: "OEM_AUTHORIZATION_CERTIFICATE",
                status: "PENDING",
                evidence: null
            });
        }
    }

    // 3. Document-Specific Semantic/Deterministic Requirements
    for (const docReq of (tender.documentRequirements || [])) {
        for (const rule of (docReq.requirements || [])) {
            // Avoid duplicating numeric rules handled above
            if (rule.rule === "MIN_COMPLETED_VALUE" && docReq.documentType === "EXPERIENCE_CRITERIA") continue;
            if (rule.rule === "MIN_DURATION_YEARS" && docReq.documentType === "EXPERIENCE_CRITERIA") continue;
            if (rule.rule === "MIN_VALUE" && docReq.documentType === "PAST_PERFORMANCE") continue;
            if (rule.rule === "MIN_VALUE" && docReq.documentType === "BIDDER_TURNOVER") continue;
            if (rule.rule === "MIN_PERCENT" && docReq.documentType === "MII_CERTIFICATE") continue;

            requirements.push({
                requirementId: `REQ_${docReq.documentType}_${rule.rule}`,
                requirementType: rule.isSemantic ? "SEMANTIC_REQUIREMENT" : "DETERMINISTIC_REQUIREMENT",
                name: rule.rule.replace(/_/g, ' '),
                required: true,
                documentType: docReq.documentType,
                originalRule: rule,
                status: "PENDING",
                evidence: null
            });
        }
    }

    // Deduplicate any overlapping IDs
    const uniqueReqs = [];
    const seenIds = new Set();
    for (const r of requirements) {
        if (!seenIds.has(r.requirementId)) {
            seenIds.add(r.requirementId);
            uniqueReqs.push(r);
        }
    }
    
    return uniqueReqs;
}

/**
 * Maps verification results to the requirement matrix.
 * Returns the fully evaluated matrix.
 */
function evaluateRequirementCoverage(matrix, documents, allDeterministicResults, allSemanticResults) {
    const uploadedTypes = new Set(documents.map(d => d.docType));

    for (const req of matrix) {
        // 1. Check Document Submission Requirements
        if (req.requirementType === "DOCUMENT_SUBMISSION") {
            const matchingDoc = documents.find(d => d.docType === req.documentType);
            if (matchingDoc) {
                req.status = "PASS";
                req.evidence = { documentId: matchingDoc._id, documentType: matchingDoc.docType };
            } else {
                req.status = "FAIL";
                req.reason = "Required document not submitted";
            }
            continue;
        }

        // If the document is missing, the requirement fails automatically or is NOT_FOUND
        const docPresent = uploadedTypes.has(req.documentType);
        if (!docPresent) {
            req.status = req.required ? "FAIL" : "NOT_APPLICABLE";
            req.reason = `Required document ${req.documentType} not submitted`;
            continue;
        }

        // Find the specific results
        if (req.requirementType === "NUMERIC_ELIGIBILITY") {
            // Find corresponding result in deterministic results
            // allDeterministicResults will have results from all documents
            const result = allDeterministicResults.find(r => r.rule === req.targetRule && r.documentType === req.documentType);
            if (result) {
                req.status = result.status;
                req.reason = result.reason;
                req.evidence = result.evidence;
            } else {
                req.status = "NOT_FOUND";
                req.reason = "Could not evaluate numeric requirement due to missing document data.";
            }
        } 
        else if (req.requirementType === "DETERMINISTIC_REQUIREMENT") {
            const result = allDeterministicResults.find(r => r.rule === req.originalRule.rule && r.documentType === req.documentType);
            if (result) {
                req.status = result.status;
                req.reason = result.reason;
                req.evidence = result.evidence;
            } else {
                req.status = "REVIEW";
                req.verificationMethod = "UNSUPPORTED_REQUIREMENT";
                req.reason = "We did not know how to verify this requirement.";
            }
        }
        else if (req.requirementType === "SEMANTIC_REQUIREMENT") {
            const result = allSemanticResults.find(r => r.rule === req.originalRule.rule && r.documentType === req.documentType);
            if (result) {
                req.status = result.status;
                req.reason = result.reason;
                req.evidence = result.evidence;
            } else {
                req.status = "REVIEW";
                req.verificationMethod = "UNSUPPORTED_REQUIREMENT";
                req.reason = "We did not know how to verify this requirement.";
            }
        }
    }

    return matrix;
}

module.exports = { buildRequirementMatrix, evaluateRequirementCoverage };
