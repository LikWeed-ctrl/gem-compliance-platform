  try {
    let promptInstruction = "";

    if (tenderDocRequirement && tenderDocRequirement.extractionSchema && tenderDocRequirement.extractionSchema.fields) {
      // DYNAMIC SCHEMA MODE
      const fields = tenderDocRequirement.extractionSchema.fields;
      let fieldInstructions = fields.map(f => {
        return `- ${f.name} (${f.type}): ${f.description || ""}`;
      }).join("\n");

      let semanticInstructions = `IMPORTANT SEMANTIC MAPPING INSTRUCTIONS:
- The field names listed above are canonical internal fields. The document will NOT necessarily contain these exact terms.
- You must map semantically similar terms in the document to these canonical fields based on their descriptions.`;

      if (docType === "EXPERIENCE_CRITERIA") {
        semanticInstructions += `
- Examples for Date: "Date of commencement" -> commencementDate, "Scheduled completion" -> scheduledCompletionDate, "Actual completion" -> actualCompletionDate.
- Do NOT infer an actual completion date from a scheduled completion date.
- Examples for Money: "Agreement Value" or "Contract Amount" -> contractValue, "Value of Work Executed" or "Completed Work Value" -> completedValue.
- CRITICAL: Do NOT automatically copy contractValue into completedValue. If the document states an awarded amount but no executed/completed amount, completedValue MUST be null.
- Examples for Identity: "Contractor", "Executing Agency", "Supplier" -> bidderName. Only map this if the context clearly indicates it is the entity whose experience is being certified. Do not confuse with the issuing organization.`;
      } else if (docType === "PAST_PERFORMANCE") {
        semanticInstructions += `
- Identity: "Supplier", "Vendor", "Agency" -> supplierName. "Purchaser", "Client", "Department" -> purchaserOrganization. Do NOT confuse the two.
- Quantities: Distinguish "quantityOrdered" from "quantitySupplied". "Order quantity" does NOT automatically mean quantitySupplied. If supplied quantity is not stated, return null. Do NOT copy one to the other.
- Dates: "Order Date", "Date of Award" -> orderDate. "Supply commenced" -> supplyStartDate. "Supply completed" -> supplyEndDate. Do NOT infer supply dates from orderDate. If missing, return null.
- Product Details: Extract the general product/item as "product". Only extract "model" if a specific model/part number is explicitly stated; otherwise model is null. Extract extra details as "description".
- Order Value: Map "PO Value", "Contract Amount", "Accepted Order Amount" to "orderValue".
- Statuses: Extract explicit statements about delivery, quality, rejection, support, and overall performance into their respective fields. Do not invent statuses if not explicitly stated (e.g. do not infer quality merely because delivery was completed). If no explicit remark is present, return null.`;
      } else if (docType === "OEM_AUTHORIZATION_CERTIFICATE") {
        semanticInstructions += `
- Identity: "Manufacturer", "OEM", "Brand Owner" -> oemName. "Dealer", "Channel Partner", "Reseller", "Bidder" -> bidderName. Do NOT confuse the OEM with the Bidder.
- Addresses: Extract the OEM's address into oemAddress, and the Bidder's address into bidderAddress. Do NOT mix them. If ambiguous, return null.
- Tender Details: "Tender No.", "GeM Bid Number" -> tenderNumber. "Name of Work", "Subject" -> tenderTitle. Only extract if context confirms they refer to the tender.
- Product Details: Extract the general category/item as "product". Extract specific part numbers/series as "model". Do NOT invent a model if only the product is mentioned.
- Authorization Scope: CRITICAL! Extract the EXACT scope (e.g., "Authorized to participate in tender" vs "Generic authorized dealer for sale"). Do NOT invent tender-specific bidding authorization if the letter is just a generic dealership certificate.
- Authorization Status: Extract explicit state (e.g., "Authorized", "Approved"). Do not infer authorization just because two companies are named.
- Commitments: Extract warrantyCommitment and supportCommitment ONLY if explicitly stated. Do NOT infer them.
- Dates/Validity: Extract validityStart and validityEnd only if explicitly stated (e.g., "Valid Until"). Do not invent dates.`;
      } else if (docType === "MII_CERTIFICATE" || docType === "MII_DECLARATION") {
        semanticInstructions += `
- Percentage Values: Map "Local content", "Domestic content", "Indigenous content" -> localContentPercent. CRITICAL: Do NOT confuse with importedContentPercent, GST, or Discounts. Only extract the local content percentage. If not explicitly stated, return null. Do NOT calculate importedContentPercent if absent.
- Numeric Normalization: Return percentages as a pure numeric or decimal value (e.g., 55 or 62.5), without the '%' symbol.
- Facts vs Compliance: Extract exactly what the document states. Do NOT output "PASS", "FAIL", or "Compliant". If the document says 40%, extract 40.
- Classifications: Map "Class-I Local Supplier", "Class-II" -> supplierClassification. Do not assume or calculate a classification based on the percentage unless the document explicitly states the class.
- Calculation & Declarations: Extract the explicit calculation methodology into calculationBasis. Extract the exact declaration statement into declarationText.
- Locations & Certification: Extract "Manufacturing facility", "Place of value addition" -> valueAdditionLocation. Extract certification details ONLY if explicitly stated.
- Identity: Map "Bidder", "Supplier" -> bidderName. Do NOT confuse with OEM if they are distinct.
- Product Details: Map general items -> product, specific part numbers -> model. Do not invent a model.`;
      } else if (docType === "WORK_ORDER") {
        semanticInstructions += `
- Identity: "Purchaser", "Client", "Procuring Entity", "Buyer" -> purchaserOrganization. "Supplier", "Vendor", "Contractor", "Awarded To", "Agency" -> supplierName. Do NOT confuse them. Do not assume the first company mentioned is the purchaser.
- Addresses & Locations: Map purchaser address to purchaserAddress, supplier address to supplierAddress. Do not mix them. "Ship To", "Consignee Address", "Place of Delivery" -> deliveryLocation. Do not confuse deliveryLocation with purchaserAddress unless explicitly identical.
- Order Numbers: "Work Order No.", "WO No." -> workOrderNumber. "Purchase Order No.", "PO No." -> purchaseOrderNumber. Do NOT put the same number in both fields unless the document explicitly equates them. Leave absent fields as null.
- Dates: "Order Date", "PO Date", "Date of Award" -> orderDate. Do NOT confuse with delivery date, invoice date, or inspection date.
- Financials & Quantities: Map "Unit Price", "Rate per Unit" -> unitPrice. Map "Total Order Value", "PO Value", "Total Amount" -> totalOrderValue. Do NOT put the total value into unitPrice. Extract values as pure numbers (e.g. 25000). Extract ordered quantity into quantity.
- Deliverables: "Item", "Goods" -> product. "Model", "Part Number" -> model. "Specifications", "Technical description" -> description. If multiple line items exist, extract the primary/relevant information based on the schema's constraints without inventing arrays if unsupported.
- Commitments: Extract warranty, installation, and commissioning explicitly. Do not assume one implies the others. Extract expected delivery timing into deliverySchedule (do not invent specific dates if a duration is given).
- Signatory: "Authorized Signatory", "Issuing Authority" -> issuingOfficer. Extract contact details explicitly.`;
      } else if (docType === "BIDDER_TURNOVER" || docType === "OEM_ANNUAL_TURNOVER") {
        semanticInstructions += `
- Identity: Extract the entity whose turnover is being certified into bidderName (or OEM name if explicitly OEM turnover). Distinguish this from the CA/accounting firm issuing the certificate (issuerFirmName, caName).
- Terminology: "Annual Turnover", "Gross Turnover", "Net Turnover", "Sales Turnover", "Revenue from Operations" -> turnoverAmount. Do NOT confuse turnover with profit, net worth, paid-up capital, assets, or taxable/GST turnover when clearly different.
- Normalization: Extract the raw amount into turnoverAmount. Extract the unit (e.g. Lakhs, Crores, Millions) into turnoverUnit. Extract the currency (e.g. INR, USD) into turnoverCurrency. CRITICAL: Calculate turnoverLakhs numerically if explicitly stated (e.g., 65 lakh -> 65, 6.5 crore -> 650, 65,00,000 -> 65). Do not guess conversion if ambiguous.
- Financial Year vs Date: Extract the specific financial year (e.g., "2023-24") into financialYear. Do NOT confuse this with the certificate issue date (certificateDate). If multiple years are present, extract the primary/requested year.
- Distinctions: Do not confuse the "turnover requirement" stated in the certificate with the actual achieved turnover.
- Issuer Details: Extract CA name, issuerFirmName, caMembershipNumber, and udin ONLY if explicitly present. Do NOT invent them.
- Missing Values: If a value or year cannot be determined confidently, return null. Do NOT guess.`;
      }

      promptInstruction = `You are a precision OCR-Extraction engine. 
Extract the following specific fields from the provided ${docType} document text.

FIELDS TO EXTRACT:
${fieldInstructions}

${semanticInstructions}

RULES:
1. Return ONLY a valid JSON object.
2. The JSON object must have a "fields" property containing the extracted keys and values.
3. The JSON object must also have an "evidence" property mapping those same keys to the exact source text/quote from the document where you found the value. Do not invent quotations.
4. Also include a "confidence" property ("high" or "low") at the root level.
5. If a value is missing or cannot be reliably determined from context, use null for both value and evidence. DO NOT guess, infer, or hallucinate.
6. Dates MUST use the format: YYYY-MM-DD. If missing, null.
7. Monetary values MUST be extracted as plain numeric integers without currency symbols or commas (e.g. "â‚¹65,00,000" becomes 6500000). Do not interpret ambiguous values.
8. Quantity should only be extracted if the document clearly specifies the quantity associated with the certified work.`;

    } else {
      // BACKWARD COMPATIBILITY MODE (FALLBACK)
      let schemaStr = JSON.stringify(DOCUMENT_SCHEMAS[docType] || { "fields": "any" });
      promptInstruction = `Extract the exact structured fields for a ${docType}. 
Return a JSON object with a "fields" property matching this schema: ${schemaStr}.
Also include an "evidence" property mapping fields to exact quotes from the text.
Also include a "confidence" property ("high" or "low"). If a value is not found, use null.
Extract dates as YYYY-MM-DD. Extract monetary values as plain integers (e.g., 5000000 for 50 Lakhs).`;
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: promptInstruction
        },
        {
          role: "user",
          content: text
        }
      ],
      model: "qwen/qwen3.8-27b",
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;
    const parsed = JSON.parse(responseContent);

    const mergedFields = { ...(parsed.fields || parsed || {}) };
    if (parsed.evidence) {
      for (const [key, val] of Object.entries(parsed.evidence)) {
        mergedFields[`${key}_evidence`] = val;
      }
    }

    return {
      extractedFields: mergedFields,
      llmConfidence: parsed.confidence || "high",
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

async function processDocument(filePath, docType, documentCategory, tenderDocRequirement = null) {
  try {
    const { text, confidence, method } = await extractRawText(filePath);
    
    let extractedFields = {};
    let verificationStatus = "PENDING"; // Start as pending, verified later by rules

    if (documentCategory === "TENDER_SPECIFIC") {
      const llmResult = await extractWithLLM(text, docType, tenderDocRequirement);
      extractedFields = llmResult.extractedFields;
      // We no longer set status to VERIFIED here. Layer A just extracts.
      verificationStatus = "PENDING";
      if (llmResult.llmConfidence === "low" && Object.keys(extractedFields).length === 0) {
          verificationStatus = "UNREADABLE";
      }
    } else {
      extractedFields = extractFieldsFromText(text, docType);
      const hasExpectedField = Object.keys(extractedFields).length > 0;
      verificationStatus = hasExpectedField ? "VERIFIED" : "UNREADABLE";
    }

    return {
      extractedFields,
      ocrConfidence: confidence,
      verificationStatus,
      extractionMethod: method,
      rawText: text, // Keep raw text for Layer C (semantic rules)
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
