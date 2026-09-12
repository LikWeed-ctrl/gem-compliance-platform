const { normalizeCompanyName } = require("./entityIdentityService");

/**
 * Normalizes product or model strings for comparison.
 */
function normalizeProductModel(str) {
    if (!str) return "";
    return String(str)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
}

function tokenizeProductModel(str) {
    if (!str) return [];
    return String(str)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(t => t.length > 0);
}

function compareProductOrModel(valA, valB, fieldType) {
    if (!valA || !valB) return { status: 'NOT_FOUND', method: 'MISSING', normA: '', normB: '' };
    
    const normA = normalizeProductModel(valA);
    const normB = normalizeProductModel(valB);

    if (normA === normB) {
        return { status: 'PASS', method: 'NORMALIZED_EXACT', normA, normB };
    }

    const tokensA = tokenizeProductModel(valA);
    const tokensB = tokenizeProductModel(valB);

    if (fieldType === 'model') {
        const isASubset = tokensA.length > 0 && tokensA.every(t => tokensB.includes(t));
        const isBSubset = tokensB.length > 0 && tokensB.every(t => tokensA.includes(t));
        if (isASubset || isBSubset) {
            return { status: 'REVIEW', method: 'TOKEN_SUBSET', normA: tokensA.join(' '), normB: tokensB.join(' ') };
        }
        return { status: 'REVIEW', method: 'MISMATCH', normA, normB };
    } else {
        let overlap = 0;
        for (let t of tokensA) { if (tokensB.includes(t)) overlap++; }
        const minTokens = Math.min(tokensA.length, tokensB.length);
        if (minTokens > 0 && overlap === minTokens) {
            return { status: 'PASS', method: 'TOKEN_SUBSET', normA: tokensA.join(' '), normB: tokensB.join(' ') };
        }
        if (overlap > 0 && overlap >= minTokens / 2) {
            return { status: 'REVIEW', method: 'PARTIAL_OVERLAP', normA: tokensA.join(' '), normB: tokensB.join(' ') };
        }
        return { status: 'REVIEW', method: 'MISMATCH', normA, normB };
    }
}

/**
 * Normalizes monetary values into standard numerical values safely.
 * Handles strings like "1.5 CR", "50 Lakhs", "5000000".
 */
function normalizeMonetary(val) {
    if (val === undefined || val === null || val === "") return null;
    const str = String(val).toLowerCase().replace(/,/g, "").trim();
    
    // Extract base number
    const match = str.match(/^([\d.]+)/);
    if (!match) return null;
    let num = parseFloat(match[1]);

    // Check for units
    if (str.includes("cr") || str.includes("crore")) {
        num *= 10000000;
    } else if (str.includes("lakh") || str.includes("lac")) {
        num *= 100000;
    } else if (str.includes("million") || str.includes("m")) {
        num *= 1000000;
    }

    return num;
}

function compareGstin(gstin1, gstin2) {
    if (!gstin1 || !gstin2) return null;
    return String(gstin1).trim().toUpperCase() === String(gstin2).trim().toUpperCase();
}

function normalizeDate(val) {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function runCrossDocumentVerification(documents) {
    const results = [];
    
    // Create a map of documents by type
    const docsByType = {};
    for (const doc of documents) {
        if (!docsByType[doc.docType]) docsByType[doc.docType] = [];
        docsByType[doc.docType].push(doc);
    }

    const getExtracted = (doc) => doc.extractedFields || {};

    const createResult = (checkType, docs, status, reason, evidenceFields) => {
        return {
            rule: checkType, // match orchestrator expectations
            checkType,
            status,
            reason,
            evidence: evidenceFields // keep it simple, maybe an array or just text. Orchestrator uses string for evidence in some places, but let's make it structured if we can, or just string.
        };
    };

    // 1. WORK ORDER <-> EXPERIENCE CERTIFICATE
    if (docsByType["WORK_ORDER"] && docsByType["EXPERIENCE_CRITERIA"]) {
        for (const wo of docsByType["WORK_ORDER"]) {
            const woExt = getExtracted(wo);
            for (const exp of docsByType["EXPERIENCE_CRITERIA"]) {
                const expExt = getExtracted(exp);

                const woPO = woExt.purchaseOrderNumber || woExt.workOrderNumber;
                const expPO = expExt.contractNumber || expExt.workOrderNumber; // Experience uses contractNumber

                // A. Check Identifiers
                let idMatch = false;
                if (woPO && expPO) {
                    if (normalizeProductModel(woPO) === normalizeProductModel(expPO)) {
                        idMatch = true;
                    }
                }

                if (woPO && expPO && !idMatch) {
                    results.push(createResult("WO_VS_EXPERIENCE", [wo, exp], "REVIEW", "Transaction identifiers differ.", 
                        "WO PO: " + woPO + ", Exp PO: " + expPO));
                    continue; 
                } else if (woPO && expPO && idMatch) {
                    results.push(createResult("WO_VS_EXPERIENCE", [wo, exp], "PASS", "Transaction identifiers match.", 
                        "WO PO: " + woPO + ", Exp PO: " + expPO));
                }

                // Financial value consistency (contractValue vs totalOrderValue)
                const woVal = normalizeMonetary(woExt.totalOrderValue);
                const expVal = normalizeMonetary(expExt.contractValue); // Only compare contractValue, NOT completedValue

                if (woVal !== null && expVal !== null) {
                    const diff = Math.abs(woVal - expVal);
                    // allow 5% difference for taxes etc
                    if (diff / Math.max(woVal, expVal) <= 0.05) {
                        results.push(createResult("WO_VS_EXPERIENCE", [wo, exp], "PASS", "Contract values are consistent.", 
                            "WO Value: " + woVal + ", Exp Contract Value: " + expVal));
                    } else {
                        results.push(createResult("WO_VS_EXPERIENCE", [wo, exp], "REVIEW", "Significant contract value mismatch.", 
                            "WO Value: " + woVal + ", Exp Contract Value: " + expVal));
                    }
                }
            }
        }
    }

    // 2. WORK ORDER <-> PAST PERFORMANCE
    if (docsByType["WORK_ORDER"] && docsByType["PAST_PERFORMANCE"]) {
        for (const wo of docsByType["WORK_ORDER"]) {
            const woExt = getExtracted(wo);
            for (const pp of docsByType["PAST_PERFORMANCE"]) {
                const ppExt = getExtracted(pp);
                
                const woPO = woExt.purchaseOrderNumber || woExt.workOrderNumber;
                const ppPO = ppExt.purchaseOrderNumber || ppExt.workOrderNumber;

                if (woPO && ppPO) {
                    if (normalizeProductModel(woPO) === normalizeProductModel(ppPO)) {
                        results.push(createResult("WO_VS_PAST_PERFORMANCE", [wo, pp], "PASS", "Order identifiers match.", 
                            "WO PO: " + woPO + ", PP PO: " + ppPO));
                    } else {
                        results.push(createResult("WO_VS_PAST_PERFORMANCE", [wo, pp], "REVIEW", "Order identifiers differ.", 
                            "WO PO: " + woPO + ", PP PO: " + ppPO));
                        continue;
                    }
                }

                const woVal = normalizeMonetary(woExt.totalOrderValue);
                const ppVal = normalizeMonetary(ppExt.totalOrderValue);
                if (woVal !== null && ppVal !== null) {
                    const diff = Math.abs(woVal - ppVal);
                    if (diff / Math.max(woVal, ppVal) <= 0.05) {
                        results.push(createResult("WO_VS_PAST_PERFORMANCE", [wo, pp], "PASS", "Order values are consistent.", 
                            "WO Value: " + woVal + ", PP Value: " + ppVal));
                    } else {
                        results.push(createResult("WO_VS_PAST_PERFORMANCE", [wo, pp], "REVIEW", "Order value mismatch.", 
                            "WO Value: " + woVal + ", PP Value: " + ppVal));
                    }
                }

                // Check GSTIN
                if (woExt.gstin && ppExt.gstin) {
                    if (compareGstin(woExt.gstin, ppExt.gstin)) {
                        results.push(createResult("WO_VS_PAST_PERFORMANCE", [wo, pp], "PASS", "Supplier GSTIN matches.", 
                            "WO GSTIN: " + woExt.gstin + ", PP GSTIN: " + ppExt.gstin));
                    } else {
                        results.push(createResult("WO_VS_PAST_PERFORMANCE", [wo, pp], "FAIL", "Supplier GSTIN mismatch.", 
                            "WO GSTIN: " + woExt.gstin + ", PP GSTIN: " + ppExt.gstin));
                    }
                }
            }
        }
    }

    // 3. EXPERIENCE <-> PAST PERFORMANCE
    if (docsByType["EXPERIENCE_CRITERIA"] && docsByType["PAST_PERFORMANCE"]) {
        for (const exp of docsByType["EXPERIENCE_CRITERIA"]) {
            const expExt = getExtracted(exp);
            for (const pp of docsByType["PAST_PERFORMANCE"]) {
                const ppExt = getExtracted(pp);
                
                const expPO = expExt.contractNumber;
                const ppPO = ppExt.purchaseOrderNumber;

                if (expPO && ppPO) {
                    if (normalizeProductModel(expPO) === normalizeProductModel(ppPO)) {
                        results.push(createResult("EXP_VS_PAST_PERFORMANCE", [exp, pp], "PASS", "Identifiers match.", 
                            "Exp PO: " + expPO + ", PP PO: " + ppPO));
                    } else {
                        results.push(createResult("EXP_VS_PAST_PERFORMANCE", [exp, pp], "REVIEW", "Identifiers differ.", 
                            "Exp PO: " + expPO + ", PP PO: " + ppPO));
                        continue;
                    }
                }

                // contractValue vs totalOrderValue
                const expVal = normalizeMonetary(expExt.contractValue);
                const ppVal = normalizeMonetary(ppExt.totalOrderValue);
                if (expVal !== null && ppVal !== null) {
                    const diff = Math.abs(expVal - ppVal);
                    if (diff / Math.max(expVal, ppVal) <= 0.05) {
                        results.push(createResult("EXP_VS_PAST_PERFORMANCE", [exp, pp], "PASS", "Values are consistent.", 
                            "Exp Contract Value: " + expVal + ", PP Value: " + ppVal));
                    } else {
                        results.push(createResult("EXP_VS_PAST_PERFORMANCE", [exp, pp], "REVIEW", "Value mismatch.", 
                            "Exp Contract Value: " + expVal + ", PP Value: " + ppVal));
                    }
                }
            }
        }
    }

    // 4. MII <-> OEM AUTHORIZATION
    if (docsByType["MII_CERTIFICATE"] && docsByType["OEM_AUTHORIZATION_CERTIFICATE"]) {
        for (const mii of docsByType["MII_CERTIFICATE"]) {
            const miiExt = getExtracted(mii);
            for (const oem of docsByType["OEM_AUTHORIZATION_CERTIFICATE"]) {
                const oemExt = getExtracted(oem);

                const modelComp = compareProductOrModel(miiExt.model, oemExt.model, 'model');
                const prodComp = compareProductOrModel(miiExt.product, oemExt.product, 'product');

                let finalStatus = 'NOT_FOUND';
                let reason = 'No product/model to compare.';
                let bestEvidence = { field: "none", status: "NOT_FOUND" };

                if (modelComp.status !== 'NOT_FOUND') {
                    finalStatus = modelComp.status;
                    reason = modelComp.status === 'PASS' ? 'Model exact match.' : (modelComp.method === 'TOKEN_SUBSET' ? 'Model suffix/qualifier difference.' : 'Model mismatch.');
                    bestEvidence = {
                        field: "model",
                        valueA: miiExt.model || "",
                        normalizedA: modelComp.normA,
                        valueB: oemExt.model || "",
                        normalizedB: modelComp.normB,
                        comparisonMethod: modelComp.method,
                        status: modelComp.status
                    };
                } else if (prodComp.status !== 'NOT_FOUND') {
                    finalStatus = prodComp.status;
                    reason = prodComp.status === 'PASS' ? 'Product description match.' : (prodComp.method === 'TOKEN_SUBSET' ? 'Product description subset overlap.' : (prodComp.method === 'PARTIAL_OVERLAP' ? 'Product description partial overlap.' : 'Product mismatch.'));
                    bestEvidence = {
                        field: "product",
                        valueA: miiExt.product || "",
                        normalizedA: prodComp.normA,
                        valueB: oemExt.product || "",
                        normalizedB: prodComp.normB,
                        comparisonMethod: prodComp.method,
                        status: prodComp.status
                    };
                }

                results.push(createResult("MII_VS_OEM_AUTH", [mii, oem], finalStatus, reason, JSON.stringify(bestEvidence)));
            }
        }
    }

    // 5. OEM AUTHORIZATION <-> OEM ANNUAL TURNOVER
    if (docsByType["OEM_AUTHORIZATION_CERTIFICATE"] && docsByType["OEM_ANNUAL_TURNOVER"]) {
        for (const auth of docsByType["OEM_AUTHORIZATION_CERTIFICATE"]) {
            const authExt = getExtracted(auth);
            for (const turn of docsByType["OEM_ANNUAL_TURNOVER"]) {
                const turnExt = getExtracted(turn);
                
                const authOEM = authExt.oemName;
                const turnOEM = turnExt.oemName;

                if (!authOEM || !turnOEM) {
                    results.push(createResult("OEM_AUTH_VS_OEM_TURNOVER", [auth, turn], "NOT_FOUND", "Missing OEM name for comparison.", "N/A"));
                } else {
                    const normAuthOEM = normalizeCompanyName(authOEM);
                    const normTurnOEM = normalizeCompanyName(turnOEM);
                    
                    if (normAuthOEM === normTurnOEM) {
                        results.push(createResult("OEM_AUTH_VS_OEM_TURNOVER", [auth, turn], "PASS", "OEM names match.", 
                            "Auth OEM: " + authOEM + ", Turnover OEM: " + turnOEM));
                    } else {
                        results.push(createResult("OEM_AUTH_VS_OEM_TURNOVER", [auth, turn], "REVIEW", "OEM names differ.", 
                            "Auth OEM: " + authOEM + ", Turnover OEM: " + turnOEM));
                    }
                }
            }
        }
    }

    return results;
}

module.exports = { runCrossDocumentVerification, normalizeProductModel, normalizeMonetary };
