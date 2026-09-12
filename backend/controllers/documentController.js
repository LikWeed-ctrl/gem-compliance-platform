const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");
const BidSubmission = require("../models/BidSubmission");
const Tender = require("../models/Tender");
const { processDocument } = require("../services/ocrService");
const path = require("path");
const fs = require("fs");

async function uploadDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { docType, documentCategory } = req.body;
    let { sellerProfileId, bidSubmissionId } = req.body;
    
    if (!docType || !documentCategory) {
      return res.status(400).json({ error: "docType and documentCategory are required" });
    }

    // Authorization enforcement
    if (req.user && req.user.role === "SELLER") {
        if (!req.user.sellerProfileId) {
            return res.status(403).json({ error: "Seller profile not associated with this account" });
        }
        sellerProfileId = req.user.sellerProfileId; // Enforce
    } else if (!sellerProfileId) {
        return res.status(400).json({ error: "sellerProfileId is required" });
    }

    let tenderDocReq = null;
    if (bidSubmissionId && documentCategory === "TENDER_SPECIFIC") {
      const bid = await BidSubmission.findById(bidSubmissionId);
      if (!bid) return res.status(404).json({ error: "Bid not found" });
      
      // Enforce ownership of the bid
      if (req.user && req.user.role === "SELLER") {
          if (bid.sellerProfile.toString() !== req.user.sellerProfileId.toString()) {
              return res.status(403).json({ error: "Forbidden: Cannot attach document to another seller's bid" });
          }
      }

      if (bid) {
        const tender = await Tender.findById(bid.tender);
        if (tender && tender.documentRequirements) {
          tenderDocReq = tender.documentRequirements.find(r => r.documentType === docType);
        }
      }
    }

    const ocrResult = await processDocument(req.file.path, docType, documentCategory, tenderDocReq);

    const document = await Document.create({
      sellerProfile: sellerProfileId,
      bidSubmission: bidSubmissionId || null,
      documentCategory,
      docType,
      filePath: req.file.filename,
      originalFilename: req.file.originalname,
      extractedFields: ocrResult.extractedFields,
      ocrConfidence: ocrResult.ocrConfidence,
      verificationStatus: ocrResult.verificationStatus,
    });

    await AuditLog.create({
      sellerProfile: sellerProfileId,
      bidSubmission: bidSubmissionId || null,
      actionType: "DOCUMENT_UPLOADED",
      actor: req.user ? req.user._id : "system",
      actorRole: (req.user && (req.user.role === "OFFICER" || req.user.role === "AI")) ? req.user.role : "SYSTEM",
      description: `Document uploaded: ${docType} (${req.file.originalname})`,
      metadata: { documentId: document._id, ocrConfidence: ocrResult.ocrConfidence },
    });

    res.status(201).json(document);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function extractPreview(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const { docType, documentCategory, bidSubmissionId } = req.body;
    if (!docType || !documentCategory) {
      return res.status(400).json({ error: "docType and documentCategory are required" });
    }

    let tenderDocReq = null;
    if (bidSubmissionId && documentCategory === "TENDER_SPECIFIC") {
      const bid = await BidSubmission.findById(bidSubmissionId);
      
      // Enforce ownership of the bid
      if (bid && req.user && req.user.role === "SELLER") {
          if (bid.sellerProfile.toString() !== req.user.sellerProfileId.toString()) {
              return res.status(403).json({ error: "Forbidden: Cannot preview document for another seller's bid" });
          }
      }

      if (bid) {
        const tender = await Tender.findById(bid.tender);
        if (tender && tender.documentRequirements) {
          tenderDocReq = tender.documentRequirements.find(r => r.documentType === docType);
        }
      }
    }

    const ocrResult = await processDocument(req.file.path, docType, documentCategory, tenderDocReq);

    res.json({
      docType,
      tempFilePath: req.file.filename,
      originalFilename: req.file.originalname,
      extractedFields: ocrResult.extractedFields,
      ocrConfidence: ocrResult.ocrConfidence,
      verificationStatus: ocrResult.verificationStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function downloadDocument(req, res) {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: "Document not found" });

        if (req.user.role === "SELLER") {
            if (doc.sellerProfile.toString() !== req.user.sellerProfileId.toString()) {
                return res.status(403).json({ error: "Forbidden: Cannot download another seller's document" });
            }
        }

        const safeFilename = path.basename(doc.filePath);
        const filePath = path.join(__dirname, "..", "uploads", safeFilename);
        
        // Prevent path traversal
        if (!filePath.startsWith(path.join(__dirname, "..", "uploads"))) {
            return res.status(403).json({ error: "Forbidden path" });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File not found on server" });
        }

        res.download(filePath, doc.originalFilename);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { uploadDocument, extractPreview, downloadDocument };