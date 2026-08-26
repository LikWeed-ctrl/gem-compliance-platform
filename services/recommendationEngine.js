const Groq = require("groq-sdk");
const ComplianceCheck = require("../models/ComplianceCheck");
const BidSubmission = require("../models/BidSubmission");
const AuditLog = require("../models/AuditLog");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function buildEvidenceSummary(checks) {
  return checks
    .map((c) => {
      return `- [${c.category}] Result: ${c.result} | Source: ${c.sourceName} (${c.sourceType}) | Checked: ${new Date(c.checkedAt).toISOString().split("T")[0]} | Detail: ${c.detail}`;
    })
    .join("\n");
}

const SYSTEM_PROMPT = `You are a helpful compliance assistant supporting a government procurement officer.

Your job: summarize a bidder's verification results into a clear, simple, easy-to-read recommendation in plain English.

STRICT RULES:
1. Write in simple, natural language. Do not use technical jargon, all-caps API codes (like BLACKLIST_DEBARMENT, CROSS_FIELD_CONSISTENCY, SIMULATED), or raw timestamps.
2. Explain the overall compliance status. State clearly if they passed the critical background checks (PAN, GST, Blacklist) or if there are issues.
3. Specifically mention the status of their tender-specific documents (like MII %, Annual Income, Experience) based on the evidence provided. If any documents were unreadable or missing, point that out clearly.
4. Keep it concise, friendly, and under 150 words. Do not make a final decision—just advise the officer.`;

async function generateRecommendation(bidSubmissionId) {
  const bidSubmission = await BidSubmission.findById(bidSubmissionId).populate("sellerProfile");
  if (!bidSubmission) throw new Error("BidSubmission not found");

  const sellerProfileId = bidSubmission.sellerProfile._id;
  const companyName = bidSubmission.sellerProfile.companyName;

  const allChecks = await ComplianceCheck.find({
    $or: [
      { bidSubmission: bidSubmissionId },
      { sellerProfile: sellerProfileId }
    ]
  }).sort({ createdAt: -1 });

  const latestChecks = [];
  const seenKeys = new Set();
  for (const check of allChecks) {
      const key = `${check.category}_${check.sourceName}`;
      if (!seenKeys.has(key)) {
          seenKeys.add(key);
          latestChecks.push(check);
      }
  }

  const evidenceSummary = buildEvidenceSummary(latestChecks);

  const userMessage = `Bidder: ${companyName}
Compliance Score: ${bidSubmission.complianceScore ?? "not yet calculated"}/100
Risk Level: ${bidSubmission.riskLevel ?? "not yet calculated"}

Verification evidence:
${evidenceSummary}

Generate the evidence-cited recommendation summary per your instructions.`;

  let recommendationText;
  let generationFailed = false;

  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      max_tokens: 500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    recommendationText = completion.choices[0]?.message?.content?.trim() || "No recommendation generated.";
  } catch (err) {
    generationFailed = true;
    recommendationText = `AI recommendation could not be generated (${err.message}). Officer should review the compliance checks below manually. Compliance score: ${bidSubmission.complianceScore ?? "N/A"}, Risk level: ${bidSubmission.riskLevel ?? "N/A"}.`;
  }

  bidSubmission.aiRecommendation = recommendationText;
  await bidSubmission.save();

  await AuditLog.create({
    sellerProfile: sellerProfileId,
    bidSubmission: bidSubmissionId,
    actionType: "AI_RECOMMENDATION_GENERATED",
    actor: "ai_engine",
    actorRole: "AI",
    description: generationFailed
      ? "AI recommendation generation failed — fallback summary used"
      : "AI recommendation generated successfully",
    metadata: { generationFailed, checksCount: latestChecks.length },
  });

  return recommendationText;
}

module.exports = { generateRecommendation };