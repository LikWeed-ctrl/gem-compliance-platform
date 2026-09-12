function normalizeCompanyName(name) {
    if (!name) return "";
    let str = name.toLowerCase();
    
    // Remove punctuation
    str = str.replace(/[.,\-\/#!$%\^&\*;:{}=\-_~()]/g, "");
    
    // Standardize suffixes
    const suffixes = ["private limited", "pvt ltd", "pvt limited", "private ltd", "limited", "ltd"];
    for (const suffix of suffixes) {
        if (str.endsWith(suffix)) {
            str = str.substring(0, str.length - suffix.length).trim();
            break; // Remove only one suffix
        }
    }
    
    // Replace multiple spaces with a single space and trim
    return str.replace(/\s+/g, " ").trim();
}

function verifyDocumentOwnership(doc, sellerProfile) {
    const extracted = doc.extractedFields || {};
    const sellerName = sellerProfile.companyName;
    const sellerGstin = sellerProfile.gstin;
    const sellerCin = sellerProfile.cin;
    const sellerPan = sellerProfile.panNumber;

    const normSeller = normalizeCompanyName(sellerName);

    // Helpers
    const compareNames = (docName) => {
        if (!docName) return { status: "NOT_FOUND", evidence: "No entity name found in document", detail: null };
        const normDoc = normalizeCompanyName(docName);
        if (normSeller === normDoc) return { status: "PASS", evidence: "Seller profile '" + sellerName + "' matches document entity '" + docName + "'" };
        // Could do more advanced similarity, but exact normalized match is safer
        return { status: "REVIEW", evidence: "Seller profile '" + sellerName + "' differs from document entity '" + docName + "'" };
    };

    const compareGstin = (docGstin) => {
        if (!docGstin || !sellerGstin) return null;
        if (docGstin.toUpperCase() === sellerGstin.toUpperCase()) return { status: "PASS", evidence: "Seller GSTIN '" + sellerGstin + "' matches document GSTIN'" };
        return { status: "FAIL", evidence: "Seller GSTIN '" + sellerGstin + "' does NOT match document GSTIN '" + docGstin + "'" };
    };

    let result = { rule: "BIDDER_OWNERSHIP", status: "NOT_APPLICABLE", reason: "No check defined for this document type.", evidence: "N/A" };

    switch (doc.docType) {
        case "EXPERIENCE_CRITERIA": {
            const nameCheck = compareNames(extracted.bidderName);
            result = {
                rule: "BIDDER_OWNERSHIP",
                status: nameCheck.status,
                reason: "Experience Certificate identity check.",
                evidence: nameCheck.evidence
            };
            break;
        }
        case "WORK_ORDER": {
            const nameCheck = compareNames(extracted.supplierName);
            const gstinCheck = compareGstin(extracted.gstin);
            
            if (gstinCheck) {
                result = {
                    rule: "BIDDER_OWNERSHIP",
                    status: gstinCheck.status,
                    reason: "Work Order identity check using GSTIN.",
                    evidence: gstinCheck.evidence
                };
            } else {
                result = {
                    rule: "BIDDER_OWNERSHIP",
                    status: nameCheck.status,
                    reason: "Work Order identity check using Supplier Name.",
                    evidence: nameCheck.evidence
                };
            }
            break;
        }
        case "PAST_PERFORMANCE": {
            const nameCheck = compareNames(extracted.supplierName);
            const gstinCheck = compareGstin(extracted.gstin);
            
            if (gstinCheck) {
                result = {
                    rule: "BIDDER_OWNERSHIP",
                    status: gstinCheck.status,
                    reason: "Past Performance identity check using GSTIN.",
                    evidence: gstinCheck.evidence
                };
            } else {
                result = {
                    rule: "BIDDER_OWNERSHIP",
                    status: nameCheck.status,
                    reason: "Past Performance identity check using Supplier Name.",
                    evidence: nameCheck.evidence
                };
            }
            break;
        }
        case "OEM_AUTHORIZATION_CERTIFICATE": {
            const nameCheck = compareNames(extracted.bidderName);
            result = {
                rule: "BIDDER_OWNERSHIP",
                status: nameCheck.status,
                reason: "OEM Authorization identity check.",
                evidence: nameCheck.evidence
            };
            break;
        }
        case "MII_CERTIFICATE": {
            // MII certificate generally specifies who is declaring local content.
            const nameCheck = compareNames(extracted.bidderName);
            result = {
                rule: "BIDDER_OWNERSHIP",
                status: nameCheck.status,
                reason: "MII Certificate identity check.",
                evidence: nameCheck.evidence
            };
            break;
        }
        case "BIDDER_TURNOVER": {
            const nameCheck = compareNames(extracted.bidderName);
            result = {
                rule: "BIDDER_OWNERSHIP",
                status: nameCheck.status,
                reason: "Turnover Certificate identity check.",
                evidence: nameCheck.evidence
            };
            break;
        }
        case "OEM_ANNUAL_TURNOVER": {
            // We specifically do NOT compare the certified OEM's identity to the SellerProfile.
            result = {
                rule: "BIDDER_OWNERSHIP",
                status: "NOT_APPLICABLE",
                reason: "OEM Annual Turnover certifies the OEM, not the bidder.",
                evidence: "No direct identity check performed."
            };
            break;
        }
        default:
            break;
    }

    return result;
}

module.exports = { verifyDocumentOwnership, normalizeCompanyName };
