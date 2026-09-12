const ComplianceCheck = require("../models/ComplianceCheck");
const BidSubmission = require("../models/BidSubmission");
const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");
const { generateRecommendation } = require("./recommendationEngine");

async function calculateComplianceScore(bidSubmissionId) {
    const bidSubmission = await BidSubmission.findById(bidSubmissionId).populate("tender sellerProfile");
    if (!bidSubmission) throw new Error("BidSubmission not found");

    const sellerProfileId = bidSubmission.sellerProfile._id;

    // Strict scoped query for current bid + seller profile base checks
    const checks = await ComplianceCheck.find({
        $or: [
            { bidSubmission: bidSubmissionId },
            { sellerProfile: sellerProfileId, bidSubmission: null },
            { sellerProfile: sellerProfileId, bidSubmission: { $exists: false } }
        ]
    });

    let score = 100;
    let critical = 0, major = 0, minor = 0, review = 0, warning = 0;
    let deduplicatedFindings = [];
    let passedRequirements = [];

    // Deduplication mechanism
    // If a document is completely missing, we shouldn't separately dock points for every rule inside that document
    // We track which docs are missing so we can ignore downstream NOT_FOUND/FAIL for those docs.
    const missingDocuments = new Set();

    function addFinding(severity, req, reason, evidence) {
        // Prevent duplicate findings for the same requirement
        if (req && deduplicatedFindings.some(f => f.requirementId === req.requirementId)) {
            return;
        }

        // Deduplication: if requirement relies on a missing document, do not double-penalize.
        if (req && req.documentType && missingDocuments.has(req.documentType) && req.requirementType !== "DOCUMENT_SUBMISSION") {
            return; // Already penalized by the DOCUMENT_SUBMISSION finding
        }

        let deduction = 0;
        switch (severity) {
            case "CRITICAL": deduction = 25; critical++; break;
            case "MAJOR": deduction = 15; major++; break;
            case "MINOR": deduction = 5; minor++; break;
            case "REVIEW": deduction = 3; review++; break;
            case "WARNING": deduction = 1; warning++; break;
        }
        score -= deduction;

        deduplicatedFindings.push({
            severity,
            points: deduction,
            requirementId: req ? req.requirementId : "GENERAL",
            requirementName: req ? req.name : "General Check",
            reason,
            evidence: evidence || null
        });
    }

    // 5. Tender Requirement Coverage (Task 11) - Process FIRST to discover missing documents
    const coverageCheck = checks.find(c => c.category === "TENDER_SPECIFIC" && c.sourceName === "Tender Requirement Coverage");
    if (coverageCheck && coverageCheck.rawResponse) {
        const matrix = coverageCheck.rawResponse;
        
        // Find missing docs first
        for (const req of matrix) {
            if (req.requirementType === "DOCUMENT_SUBMISSION" && req.status === "FAIL" && req.required) {
                missingDocuments.add(req.documentType);
                addFinding("CRITICAL", req, req.reason || "Required document missing", req.evidence);
            }
        }

        for (const req of matrix) {
            if (req.status === "PASS") {
                passedRequirements.push(req);
            } else if (req.status === "FAIL") {
                if (req.requirementType !== "DOCUMENT_SUBMISSION") { // Already handled
                    addFinding("MAJOR", req, req.reason || "Requirement failed", req.evidence);
                }
            } else if (req.status === "NOT_FOUND") {
                addFinding("MINOR", req, req.reason || "Requirement evidence not found", req.evidence);
            } else if (req.status === "REVIEW" || req.status === "UNSUPPORTED_REQUIREMENT") {
                addFinding("REVIEW", req, req.reason || "Requires manual officer review", req.evidence);
            }
        }
    }

    // 1. Process Seller Profile Checks (PAN, GST, Blacklist)
    const profileChecks = checks.filter(c => !c.bidSubmission);
    for (const pc of profileChecks) {
        if (pc.result === "FAIL") {
            addFinding("CRITICAL", null, `Seller Profile verification failed: ${pc.sourceName}`, pc.detail);
        } else if (pc.result === "REVIEW") {
            addFinding("REVIEW", null, `Seller Profile requires review: ${pc.sourceName}`, pc.detail);
        }
    }

    // 2. Identity Verification (Task 8) & 3. Internal Consistency (Task 10)
    // These are bundled inside "Layer B/C" checks' rawResponse array
    const docLayerChecks = checks.filter(c => c.category === "TENDER_SPECIFIC" && c.sourceName.startsWith("Layer B/C:"));
    for (const dlc of docLayerChecks) {
        if (dlc.rawResponse && Array.isArray(dlc.rawResponse)) {
            // Identity checks
            const idChecks = dlc.rawResponse.filter(r => r.rule === "BIDDER_OWNERSHIP" || (r.evidence && r.evidence.includes("matches document entity")));
            for (const ic of idChecks) {
                if (ic.status === "FAIL") addFinding("MAJOR", null, `Identity Mismatch: ${dlc.sourceName}`, ic.evidence);
                else if (ic.status === "REVIEW") addFinding("REVIEW", null, `Identity Review: ${dlc.sourceName}`, ic.evidence);
            }
            
            // Internal Consistency
            const intChecks = dlc.rawResponse.filter(r => r.rule === "INTERNAL_CONSISTENCY" || (r.evidence && r.evidence.includes("contradicts")));
            for (const inc of intChecks) {
                if (inc.status === "FAIL") addFinding("MAJOR", null, `Internal Contradiction: ${dlc.sourceName}`, inc.evidence);
                else if (inc.status === "REVIEW") addFinding("REVIEW", null, `Internal Consistency Review: ${dlc.sourceName}`, inc.evidence);
            }
        }
    }

    // 4. Cross Document (Task 9)
    // Bundled in Cross Document Consistency check
    const crossCheckSummary = checks.find(c => c.category === "TENDER_SPECIFIC" && c.sourceName === "Cross-Document Engine");
    if (crossCheckSummary && crossCheckSummary.rawResponse && Array.isArray(crossCheckSummary.rawResponse)) {
        for (const cc of crossCheckSummary.rawResponse) {
            if (cc.status === "FAIL") addFinding("MAJOR", null, `Cross-Document Contradiction: ${cc.rule}`, cc.evidence);
            else if (cc.status === "REVIEW") addFinding("REVIEW", null, `Cross-Document Review: ${cc.rule}`, cc.evidence);
        }
    }

    if (score < 0) score = 0;
    if (score > 100) score = 100;

    let complianceStatus = "COMPLIANT";
    if (score < 70 || critical > 0) complianceStatus = "NON_COMPLIANT";
    else if (score < 85 || major > 0 || review > 0) complianceStatus = "REVIEW_REQUIRED";

    let riskLevel = "LOW";
    if (critical > 0 || major > 1) riskLevel = "HIGH";
    else if (major === 1 || review > 0 || minor > 1) riskLevel = "MEDIUM";

    const aiAssessment = {
        complianceScore: score,
        complianceStatus,
        riskLevel,
        scoreBreakdown: {
            startingScore: 100,
            criticalDeductions: critical * 25,
            majorDeductions: major * 15,
            minorDeductions: minor * 5,
            reviewDeductions: review * 3,
            warningDeductions: warning * 1,
            finalScore: score
        },
        findings: deduplicatedFindings,
        passedRequirements: passedRequirements.map(req => ({
            requirementId: req.requirementId,
            requirementName: req.name,
            evidence: req.evidence
        }))
    };

    bidSubmission.complianceScore = score;
    bidSubmission.complianceStatus = complianceStatus;
    bidSubmission.riskLevel = riskLevel;
    bidSubmission.aiAssessmentDetails = aiAssessment;

    try {
        await bidSubmission.save();
    } catch (e) {
        console.error("Save BidSubmission failed:", e);
    }

    try {
        await AuditLog.create({
            sellerProfile: sellerProfileId,
            bidSubmission: bidSubmissionId,
            actionType: "SCORE_CALCULATED",
            actor: "system_deterministic",
            actorRole: "SYSTEM",
            description: `Deterministic Compliance Assessment generated: ${score}/100, status: ${complianceStatus}`,
            metadata: { score, complianceStatus, riskLevel }
        });
    } catch (e) {
        console.error("AuditLog failed:", e);
    }

    try {
        const { generateRecommendation } = require("./recommendationEngine");
        await generateRecommendation(bidSubmissionId, aiAssessment);
    } catch (e) {
        console.error("generateRecommendation failed:", e);
    }
    
    return { bidSubmission, checks, finalScore: score, riskLevel, aiAssessment };
}

module.exports = { calculateComplianceScore };
