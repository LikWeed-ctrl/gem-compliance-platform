const Groq = require("groq-sdk");
const BidSubmission = require("../models/BidSubmission");
const AuditLog = require("../models/AuditLog");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a helpful compliance assistant supporting a government procurement officer.

Your job: summarize a bidder's deterministic verification findings into a clear, simple, easy-to-read recommendation in plain English.

STRICT RULES:
1. Write in simple, natural language. Do not use technical jargon, all-caps API codes, or raw timestamps.
2. Explain the overall compliance status. State clearly if there are critical issues.
3. Keep it concise, friendly, and under 150 words. Do not make a final decision — just advise the officer.
4. You MUST NOT invent any findings or scores. Base your summary strictly on the findings array provided.
5. Prioritize mentioning missing documents, identity mismatches, or cross-document contradictions if present.
6. If there are no findings and the score is 100, state that everything appears compliant and recommend standard processing.
7. NEVER use the words "Fraud", "Trust Score", "Fake", or "Authentic". Use "Inconsistency", "Missing Evidence", or "Requires Review".
8. AI RECOMMENDATION SAFETY: You must distinguish VERIFIED vs NOT VERIFIED vs FAILED vs SUSPICIOUS. 
   - COULD_NOT_VERIFY / NOT_FOUND / REVIEW must NOT be described as proof that an entity is illegitimate, fraudulent, forged, or unauthentic.
   - You may recommend manual verification when evidence is incomplete.
   - Base your recommendation purely on deterministic findings and do not escalate uncertainty into an accusation.
   - Example GOOD statement: "GST/PAN verification could not be independently confirmed. Manual verification of the bidder's registration details is recommended before a final decision."`;

async function generateRecommendation(bidSubmissionId, aiAssessment) {
    const bidSubmission = await BidSubmission.findById(bidSubmissionId).populate("sellerProfile");
    if (!bidSubmission) throw new Error("BidSubmission not found");

    const companyName = bidSubmission.sellerProfile.companyName;

    // Filter findings to summarize
    const criticalFindings = aiAssessment.findings.filter(f => f.severity === "CRITICAL").map(f => f.requirementName + ": " + f.reason);
    const majorFindings = aiAssessment.findings.filter(f => f.severity === "MAJOR").map(f => f.requirementName + ": " + f.reason);
    const reviewFindings = aiAssessment.findings.filter(f => f.severity === "REVIEW").map(f => f.requirementName + ": " + f.reason);

    const userMessage = `Bidder: ${companyName}
Compliance Score: ${aiAssessment.complianceScore}/100
Risk Level: ${aiAssessment.riskLevel}

Critical Findings: ${criticalFindings.length > 0 ? criticalFindings.join("; ") : "None"}
Major Findings: ${majorFindings.length > 0 ? majorFindings.join("; ") : "None"}
Review Items: ${reviewFindings.length > 0 ? reviewFindings.join("; ") : "None"}
Passed Requirements: ${aiAssessment.passedRequirements.length}

Generate the evidence-cited recommendation summary per your instructions.`;

    let recommendationText;
    let generationFailed = false;

    try {
        const completion = await groq.chat.completions.create({
            model: "qwen/qwen3.8-27b",
            max_tokens: 300,
            temperature: 0.2,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userMessage },
            ],
        });

        recommendationText = completion.choices[0]?.message?.content?.trim() || "No recommendation generated.";
    } catch (err) {
        console.error("AI Recommendation failed:", err.message);
        generationFailed = true;
        recommendationText = `AI recommendation could not be generated. Please review the compliance score (${aiAssessment.complianceScore}) and findings manually.`;
    }

    bidSubmission.aiRecommendation = recommendationText;
    await bidSubmission.save();

    await AuditLog.create({
        sellerProfile: bidSubmission.sellerProfile._id,
        bidSubmission: bidSubmissionId,
        actionType: "AI_RECOMMENDATION_GENERATED",
        actor: "ai_engine",
        actorRole: "AI",
        description: generationFailed
            ? "AI recommendation generation failed — fallback summary used"
            : "AI recommendation generated successfully from deterministic score",
        metadata: { generationFailed, score: aiAssessment.complianceScore },
    });

    return recommendationText;
}

module.exports = { generateRecommendation };
