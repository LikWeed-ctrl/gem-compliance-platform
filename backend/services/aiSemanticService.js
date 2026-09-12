const { Groq } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Layer C — AI semantic verification
 * Used for interpreting subjectivity (e.g., "similar work", "authorization scope").
 */

async function evaluateSemanticRule(rule, tenderContext, documentRawText) {
  let systemPrompt = "";

  if (rule.rule === "SIMILAR_WORK_REQUIRED") {
    systemPrompt = `You are a Tender Evaluation Expert. Determine if the work described in the attached certificate is semantically similar to the tender requirements.
Tender requirements: ${tenderContext.workDescription || "General IT equipment supply"}
Respond ONLY in valid JSON:
{
  "status": "PASS" | "FAIL" | "REVIEW",
  "confidence": "high" | "medium" | "low",
  "reason": "Explain your reasoning concisely",
  "evidence": "Quote the exact phrase from the certificate that justifies this"
}`;
  } else if (rule.rule === "AUTHORIZATION_SCOPE") {
    systemPrompt = `You are a Tender Evaluation Expert. Determine if the OEM authorization letter explicitly covers the specific product model and tender mentioned.
Tender requires authorization for product: ${tenderContext.requiredProduct || "Laptops"}
Tender Number: ${tenderContext.tenderNumber || "UNKNOWN"}
Respond ONLY in valid JSON:
{
  "status": "PASS" | "FAIL" | "REVIEW",
  "confidence": "high" | "medium" | "low",
  "reason": "Explain your reasoning concisely",
  "evidence": "Quote the exact phrase from the letter that justifies this"
}`;
  } else {
    systemPrompt = `You are a Tender Evaluation Expert. Evaluate the attached document against the following rule:
Rule: ${rule.rule}
Details: ${JSON.stringify(rule)}
Respond ONLY in valid JSON:
{
  "status": "PASS" | "FAIL" | "REVIEW",
  "confidence": "high" | "medium" | "low",
  "reason": "Explain your reasoning concisely",
  "evidence": "Quote the exact phrase from the document that justifies this"
}`;
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Document Text:\n${documentRawText}` }
      ],
      model: "qwen/qwen3.8-27b",
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;
    const parsed = JSON.parse(responseContent);

    return {
      rule: rule.rule,
      required: rule.value !== undefined ? rule.value : "Semantic Match",
      found: "AI Evaluation",
      status: parsed.status,
      reason: parsed.reason,
      evidence: parsed.evidence,
      confidence: parsed.confidence
    };
  } catch (error) {
    console.error("Semantic verification failed:", error);
    return {
      rule: rule.rule,
      required: "Semantic Match",
      found: "Error",
      status: "REVIEW",
      reason: `AI check failed: ${error.message}`,
      evidence: "",
      confidence: "low"
    };
  }
}

async function runSemanticRules(rawText, requirements, tenderContext) {
  const results = [];
  const semanticRules = requirements.filter(req => req.isSemantic === true || req.rule === "SIMILAR_WORK_REQUIRED" || req.rule === "AUTHORIZATION_SCOPE");

  for (const req of semanticRules) {
    const outcome = await evaluateSemanticRule(req, tenderContext, rawText);
    results.push(outcome);
  }

  return results;
}

module.exports = { runSemanticRules, evaluateSemanticRule };
