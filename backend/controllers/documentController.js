const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");
const { processDocument } = require("../services/ocrService");

async function uploadDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { docType, sellerProfileId, bidSubmissionId, documentCategory } = req.body;
    if (!docType || !sellerProfileId || !documentCategory) {
      return res.status(400).json({ error: "docType, sellerProfileId and documentCategory are required" });
    }

    const ocrResult = await processDocument(req.file.path, docType, documentCategory);

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
      actor: "system",
      actorRole: "SYSTEM",
      description: `Document uploaded: ${docType} (${req.file.originalname})`,
      metadata: { documentId: document._id, ocrConfidence: ocrResult.ocrConfidence },
    });

    await AuditLog.create({
      sellerProfile: sellerProfileId,
      bidSubmission: bidSubmissionId || null,
      actionType: "OCR_EXTRACTED",
      actor: "system",
      actorRole: "SYSTEM",
      description: `OCR extraction completed for ${docType}`,
      metadata: { extractedFields: ocrResult.extractedFields, status: ocrResult.verificationStatus },
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
    const { docType, documentCategory } = req.body;
    if (!docType || !documentCategory) {
      return res.status(400).json({ error: "docType and documentCategory are required" });
    }

    const ocrResult = await processDocument(req.file.path, docType, documentCategory);

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

module.exports = { uploadDocument, extractPreview };