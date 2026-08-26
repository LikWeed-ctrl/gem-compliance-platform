const Tesseract = require("tesseract.js");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const path = require("path");
const { Groq } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Extracts raw text from a document, handling both image files
 * (via Tesseract OCR) and text-based PDFs (via pdf-parse, faster
 * and more accurate than OCR for PDFs that already contain text).
 */
async function extractRawText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text || "";

    if (text.trim().length < 20) {
      return { text, confidence: 0.3, method: "pdf-parse-low-yield" };
    }
    return { text, confidence: 0.9, method: "pdf-parse" };
  }

  // image files — run OCR
  const result = await Tesseract.recognize(filePath, "eng");
  return {
    text: result.data.text,
    confidence: result.data.confidence / 100, // Tesseract gives 0-100, normalize to 0-1
    method: "tesseract-ocr",
  };
}

/**
 * Regex-based field extraction per document type. This is intentionally
 * simple/deterministic (not LLM-based) for structured government ID
 * formats — PAN, GSTIN, and CIN all follow fixed, well-documented
 * patterns, so regex is faster, cheaper, and more reliable than an LLM
 * call for this specific extraction task.
 */
function extractFieldsFromText(text, docType) {
  const fields = {};
  const cleanText = text.replace(/\s+/g, " ");

  const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/;
  const GSTIN_REGEX = /\b\d{2}[A-Z]{5}\d{4}[A-Z]\dZ[A-Z\d]\b/;
  const UDYAM_REGEX = /\bUDYAM-[A-Z]{2}-\d{2}-\d{7}\b/;
  const CIN_REGEX = /\b[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/;

  switch (docType) {
    case "PAN": {
      const match = cleanText.match(PAN_REGEX);
      if (match) fields.panNumber = match[0];
      break;
    }
    case "GST_CERTIFICATE": {
      const match = cleanText.match(GSTIN_REGEX);
      if (match) fields.gstin = match[0];
      break;
    }
    case "UDYAM_CERTIFICATE": {
      const match = cleanText.match(UDYAM_REGEX);
      if (match) fields.udyamNumber = match[0];
      break;
    }
    case "CIN_CERTIFICATE": {
      const match = cleanText.match(CIN_REGEX);
      if (match) fields.cin = match[0];
      break;
    }
    default: {
      const panMatch = cleanText.match(PAN_REGEX);
      const gstinMatch = cleanText.match(GSTIN_REGEX);
      if (panMatch) fields.panNumber = panMatch[0];
      if (gstinMatch) fields.gstin = gstinMatch[0];
      fields.rawTextSnippet = cleanText.slice(0, 300); // for manual officer review
    }
  }

  return fields;
}

/**
 * LLM-based extraction for tender-specific documents.
 * These are free-form, varied layout documents where a specific extraction is needed.
 */
async function extractWithLLM(text, docType) {
  try {
    let promptInstruction = "";
    if (docType === "BIDDER_TURNOVER") {
      promptInstruction = "Extract the declared annual turnover figure in ₹ lakhs, the financial year, and the 18-digit CA UDIN (Unique Document Identification Number) if present.";
    } else if (docType === "EXPERIENCE_CRITERIA") {
      promptInstruction = "Extract the years of experience claimed and the name of the issuing organization.";
    } else if (docType === "PAST_PERFORMANCE") {
      promptInstruction = "Extract the total value of past performance in ₹ lakhs.";
    } else if (docType === "OEM_AUTHORIZATION_CERTIFICATE") {
      promptInstruction = "Extract the name of the OEM, their Udyam/Registration number if mentioned, and whether they explicitly authorize the bidder.";
    } else if (docType === "MII_CERTIFICATE") {
      promptInstruction = "Extract the Make in India local content percentage and the MII Class (e.g., Class1, Class2).";
    } else {
      promptInstruction = "Extract the key entities, figures, and claims made in this document.";
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an AI data extractor. Here is the raw OCR text of a document claiming to be a ${docType}. 
${promptInstruction}
Respond ONLY in valid JSON format matching this schema: 
{ "fields": { [key: string]: any }, "confidence": "high" | "low", "reason_if_low": "string or null" }.
If you cannot confidently find this information, set confidence to 'low' and do NOT guess a number.`
        },
        {
          role: "user",
          content: text
        }
      ],
      model: "openai/gpt-oss-20b", // Custom mocked tier on Groq
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;
    const parsed = JSON.parse(responseContent);

    return {
      extractedFields: parsed.fields || {},
      llmConfidence: parsed.confidence,
      reason_if_low: parsed.reason_if_low
    };
  } catch (error) {
    console.error("LLM Extraction failed:", error);
    return {
      extractedFields: {},
      llmConfidence: "low",
      reason_if_low: error.message
    };
  }
}

/**
 * Full pipeline: extract text, then extract structured fields.
 * Returns everything needed to populate a Document record.
 */
async function processDocument(filePath, docType, documentCategory) {
  try {
    const { text, confidence, method } = await extractRawText(filePath);
    
    let extractedFields = {};
    let verificationStatus = "UNREADABLE";

    if (documentCategory === "TENDER_SPECIFIC") {
      const llmResult = await extractWithLLM(text, docType);
      extractedFields = llmResult.extractedFields;
      if (llmResult.llmConfidence === "high") {
        verificationStatus = "VERIFIED";
      } else {
        verificationStatus = "UNREADABLE";
        extractedFields.reason_if_low = llmResult.reason_if_low;
      }
    } else {
      // REGISTRATION category (or fallback)
      extractedFields = extractFieldsFromText(text, docType);
      const hasExpectedField = Object.keys(extractedFields).length > 0;
      verificationStatus = hasExpectedField ? "VERIFIED" : "UNREADABLE";
    }

    return {
      extractedFields,
      ocrConfidence: confidence,
      verificationStatus,
      extractionMethod: method,
    };
  } catch (err) {
    return {
      extractedFields: {},
      ocrConfidence: 0,
      verificationStatus: "UNREADABLE",
      error: err.message,
    };
  }
}

module.exports = { processDocument };