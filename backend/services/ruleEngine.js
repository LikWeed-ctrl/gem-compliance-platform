/**
 * Layer B - Deterministic rules
 * Use code wherever the answer can be calculated or compared exactly.
 */

function parseNumericSafe(value) {
  if (value === undefined || value === null) return { value: null, isReliable: false, unit: 'NONE' };
  if (typeof value === 'number') return { value, isReliable: true, unit: 'PURE' };
  if (typeof value !== 'string') return { value: null, isReliable: false, unit: 'NONE' };

  // Heuristic cleanup
  let str = value.trim().toLowerCase();

  // Handle percents
  let isPercent = false;
  if (str.includes('%')) {
      isPercent = true;
      str = str.replace('%', '');
  }

  // Handle words
  let multiplier = 1;
  let hasUnitWord = false;
  if (str.includes('lakh') || str.includes('lacs')) {
      multiplier = 100000;
      hasUnitWord = true;
  } else if (str.includes('crore') || str.includes('cr')) {
      multiplier = 10000000;
      hasUnitWord = true;
  } else if (str.includes('million')) {
      multiplier = 1000000;
      hasUnitWord = true;
  }

  // Strip currencies and standard formatting, keep digits and decimal point
  str = str.replace(/[^0-9.-]/g, '');

  if (str === '') return { value: null, isReliable: false, unit: 'NONE' };

  const num = parseFloat(str);
  if (isNaN(num)) return { value: null, isReliable: false, unit: 'NONE' };

  if (isPercent) return { value: num, isReliable: true, unit: 'PERCENT' };

  // If a multiplier word was used, we return the value converted to RAW (e.g. 15000000)
  if (hasUnitWord) {
      return { value: num * multiplier, isReliable: true, unit: 'RAW' };
  }

  // If there was no unit word, we check if it looks like raw rupees vs pure number.
  // We'll just call it 'PURE'. The caller can decide how to treat it.
  return { value: num, isReliable: true, unit: 'PURE' };
}

function evaluateNumericThreshold(foundRawValue, requiredRawValue, ruleType, targetField) {
  // Unit conversion handling before parsing logic
  let foundNorm = parseNumericSafe(foundRawValue);
  const reqNorm = parseNumericSafe(requiredRawValue);
  
  if (!foundNorm.isReliable || !reqNorm.isReliable) {
      return { 
          status: "REVIEW", 
          reason: `Could not reliably parse numerical values for comparison. Found: '${foundRawValue}', Required: '${requiredRawValue}'` 
      };
  }

  let found = foundNorm.value;
  let required = reqNorm.value;

  let evidenceStr = `Extracted value: ${foundRawValue} → normalized to ${found}. Tender threshold: ${required}.`;

  // UNIT SAFETY CHECKS
  if (targetField === "totalOrderValue") {
      // Past Performance extracts raw rupees, but requirement is in Lakhs.
      // E.g. found = 8000000 (PURE or RAW), required = 80 Lakhs
      // If it's pure, we assume it's raw rupees because the schema extracts raw rupees.
      found = found / 100000;
      evidenceStr = `Extracted value: ${foundRawValue} → normalized to ${found} Lakhs. Tender threshold: ${required} Lakhs.`;
  } else if (targetField === "turnoverLakhs") {
      // Turnover extracts in Lakhs.
      // If the LLM successfully extracted "150" (PURE), it's 150 Lakhs.
      // If the LLM extracted "150 lakh" (RAW), found is 15000000. We must convert RAW back to Lakhs.
      if (foundNorm.unit === 'RAW') {
          found = found / 100000;
      }
      evidenceStr = `Extracted value: ${foundRawValue} → normalized to ${found} Lakhs. Tender threshold: ${required} Lakhs.`;
  } else if (targetField === "localContentPercent") {
      evidenceStr = `Extracted MII: ${foundRawValue} → normalized to ${found}%. Tender threshold: ${required}%.`;
  }

  if (ruleType === "MIN_COMPLETED_VALUE" || ruleType === "MIN_VALUE" || ruleType === "MIN_PERCENT") {
    if (found >= required) {
      return { status: "PASS", reason: `${evidenceStr} ${found} >= ${required} → PASS.` };
    } else {
      return { status: "FAIL", reason: `${evidenceStr} ${found} < ${required} → FAIL.` };
    }
  }

  if (ruleType === "MAX_VALUE" || ruleType === "MAX_PERCENT") {
    if (found <= required) {
      return { status: "PASS", reason: `${evidenceStr} ${found} <= ${required} → PASS.` };
    } else {
      return { status: "FAIL", reason: `${evidenceStr} ${found} > ${required} → FAIL.` };
    }
  }

  return { status: "REVIEW", reason: `Unknown numeric rule type: ${ruleType}` };
}

function evaluateDurationYears(startDateStr, endDateStr, requiredYearsRaw) {
  if (!startDateStr || !endDateStr) {
      return { status: "NOT_FOUND", reason: "Missing required dates to calculate duration." };
  }

  const start = new Date(startDateStr.split("-").reverse().join("-"));
  const end = new Date(endDateStr.split("-").reverse().join("-"));

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { status: "REVIEW", reason: `Could not parse dates: start='${startDateStr}', end='${endDateStr}'` };
  }

  // Calculate years duration
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  const durationYears = diffDays / 365.25;

  const reqYearsNorm = parseNumericSafe(requiredYearsRaw);
  if (!reqYearsNorm.isReliable) {
      return { status: "REVIEW", reason: `Invalid tender requirement: '${requiredYearsRaw}' years.` };
  }

  let evidenceStr = `Extracted dates: ${startDateStr} to ${endDateStr} → ${durationYears.toFixed(2)} years. Tender minimum: ${reqYearsNorm.value} years.`;

  if (durationYears >= reqYearsNorm.value) {
      return { status: "PASS", reason: `${evidenceStr} ${durationYears.toFixed(2)} >= ${reqYearsNorm.value} → PASS.` };
  } else {
      return { status: "FAIL", reason: `${evidenceStr} ${durationYears.toFixed(2)} < ${reqYearsNorm.value} → FAIL.` };
  }
}

function evaluateDateWindow(foundDate, windowStart, windowEnd) {
  const fDate = new Date(foundDate);
  const start = windowStart ? new Date(windowStart) : null;
  const end = windowEnd ? new Date(windowEnd) : null;

  if (isNaN(fDate.getTime())) return { status: "REVIEW", reason: "Found date is invalid or missing." };

  if (start && fDate < start) return { status: "FAIL", reason: `Date ${foundDate} is before allowed window start ${windowStart}.` };
  if (end && fDate > end) return { status: "FAIL", reason: `Date ${foundDate} is after allowed window end ${windowEnd}.` };

  return { status: "PASS", reason: `Date ${foundDate} is within allowed window.` };
}

function evaluateIdentity(nameA, nameB) {
  if (!nameA || !nameB) return { status: "REVIEW", reason: "Missing identity to compare." };
  
  const normA = nameA.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normB = nameB.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (normA.includes(normB) || normB.includes(normA)) {
    return { status: "PASS", reason: `Identities ${nameA} and ${nameB} are likely matching.` };
  }
  
  return { status: "REVIEW", reason: `Identities ${nameA} and ${nameB} do not perfectly match. Manual review required.` };
}

function evaluateBoolean(foundValue, requiredValue) {
    if (Boolean(foundValue) === Boolean(requiredValue)) {
        return { status: "PASS", reason: "Boolean requirement met." };
    }
    return { status: "FAIL", reason: `Required ${requiredValue} but found ${foundValue}.` };
}

function evaluateArithmeticConsistency(parts, total) {
   let sum = 0;
   for (const p of parts) {
       const norm = parseNumericSafe(p);
       if (norm.isReliable) sum += norm.value;
   }
   
   const normTotal = parseNumericSafe(total);
   if (!normTotal.isReliable) return { status: "REVIEW", reason: "Total is not reliable." };

   if (sum === normTotal.value) {
       return { status: "PASS", reason: "Arithmetic parts equal the total." };
   }
   return { status: "REVIEW", reason: `Arithmetic inconsistency: Parts sum to ${sum}, but total is ${normTotal.value}.` };
}

/**
 * Runs deterministic checks based on structured tender requirements.
 */
function runDeterministicRules(extractedFields, requirements) {
  const results = [];

  for (const req of requirements) {
    let outcome = { status: "NOT_APPLICABLE", reason: "No rule evaluated" };
    let evidence = `Extracted value for ${req.targetField}: ${extractedFields[req.targetField]}`;

    if (req.rule.startsWith("MIN_") || req.rule.startsWith("MAX_")) {
        // Special case: If rule is MIN_DURATION_YEARS, it doesn't just read targetField
        if (req.rule === "MIN_DURATION_YEARS") {
            const start = extractedFields[req.startField];
            const end = extractedFields[req.endField];
            if (start && end) {
                outcome = evaluateDurationYears(start, end, req.value);
                evidence = outcome.reason;
            } else {
                outcome = { status: "NOT_FOUND", reason: `Required date fields '${req.startField}' or '${req.endField}' not found.` };
                evidence = outcome.reason;
            }
        } else {
            let found = extractedFields[req.targetField];
            let required = req.value;

            if (found !== undefined && found !== null) {
                outcome = evaluateNumericThreshold(found, required, req.rule, req.targetField);
                evidence = outcome.reason; // Output detailed evidence
            } else {
                outcome = { status: "NOT_FOUND", reason: `Required field '${req.targetField}' not found in document.` };
                evidence = outcome.reason;
            }
        }
    } else if (req.rule === "EXPERIENCE_WINDOW") {
        const found = extractedFields[req.targetField];
        if (found) {
            outcome = evaluateDateWindow(found, req.windowStart, req.windowEnd);
            evidence = outcome.reason;
        } else {
            outcome = { status: "NOT_FOUND", reason: `Required date field '${req.targetField}' not found.` };
            evidence = outcome.reason;
        }
    } else if (req.rule === "IDENTITY_MATCH") {
        outcome = evaluateIdentity(extractedFields[req.targetField], req.compareValue);
        evidence = outcome.reason;
    } else if (req.rule === "BOOLEAN_CHECK") {
        const found = extractedFields[req.targetField];
        if (found !== undefined && found !== null) {
            outcome = evaluateBoolean(found, req.value);
            evidence = outcome.reason;
        } else {
            outcome = { status: "NOT_FOUND", reason: `Required boolean field '${req.targetField}' not found.` };
            evidence = outcome.reason;
        }
    }

    results.push({
      rule: req.rule,
      required: req.value !== undefined ? req.value : req.targetField,
      found: extractedFields[req.targetField] || `${extractedFields[req.startField]} to ${extractedFields[req.endField]}`,
      status: outcome.status,
      reason: outcome.reason,
      evidence: evidence
    });
  }

  return results;
}

module.exports = { 
    evaluateNumericThreshold, 
    evaluateDurationYears,
    evaluateDateWindow, 
    evaluateIdentity, 
    runDeterministicRules,
    evaluateArithmeticConsistency,
    parseNumericSafe
};
