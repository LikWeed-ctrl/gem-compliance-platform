const BidSubmission = require("../models/BidSubmission");
const SellerProfile = require("../models/SellerProfile");
const Tender = require("../models/Tender");
const ComplianceCheck = require("../models/ComplianceCheck");
const AuditLog = require("../models/AuditLog");
const Document = require("../models/Document");

const { runBidSubmissionChecks } = require("../services/verificationOrchestrator");
const { runTenderSpecificRules } = require("../services/ruleEngine");
const { calculateComplianceScore } = require("../services/scoringEngine");
const { generateRecommendation } = require("../services/recommendationEngine");

async function createBidder(req, res) {
  try {
    const { sellerProfileData, bidSubmissionData } = req.body;
    
    // Create or find SellerProfile
    let sellerProfile;
    if (sellerProfileData.panNumber) {
        sellerProfile = await SellerProfile.findOne({ panNumber: sellerProfileData.panNumber });
    }
    
    if (!sellerProfile) {
        sellerProfile = await SellerProfile.create(sellerProfileData);
    } else {
        // Update it if needed
        Object.assign(sellerProfile, sellerProfileData);
        await sellerProfile.save();
    }

    bidSubmissionData.sellerProfile = sellerProfile._id;
    const bidSubmission = await BidSubmission.create(bidSubmissionData);

    await AuditLog.create({
      sellerProfile: sellerProfile._id,
      bidSubmission: bidSubmission._id,
      tender: bidSubmission.tender,
      actionType: "DOCUMENT_UPLOADED", 
      actor: "system",
      actorRole: "SYSTEM",
      description: `Bid submission record created for ${sellerProfile.companyName}`,
    });

    res.status(201).json({ bidSubmission, sellerProfile });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}


async function getBiddersByTender(req, res) {
  try {
    const bids = await BidSubmission.find({ tender: req.params.tenderId }).populate("sellerProfile").sort({ complianceScore: -1 });
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getBidderById(req, res) {
  try {
    const bid = await BidSubmission.findById(req.params.id).populate("tender").populate("sellerProfile");
    if (!bid) return res.status(404).json({ error: "Bid not found" });
    const allDocs = await Document.find({
        $or: [
            { bidSubmission: req.params.id },
            { sellerProfile: bid.sellerProfile._id }
        ]
    }).sort({ createdAt: -1 });

    const latestDocs = [];
    const seenDocTypes = new Set();
    for (const doc of allDocs) {
        if (!seenDocTypes.has(doc.docType)) {
            seenDocTypes.add(doc.docType);
            latestDocs.push(doc);
        }
    }

    res.json({ ...bid.toObject(), documents: latestDocs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


async function runChecksForBidder(req, res) {
  try {
    const bid = await BidSubmission.findById(req.params.id).populate("sellerProfile");
    if (!bid) return res.status(404).json({ error: "Bid not found" });

    const tender = await Tender.findById(bid.tender);
    if (!tender) return res.status(404).json({ error: "Associated tender not found" });

    const profile = bid.sellerProfile;
    const checks = await runBidSubmissionChecks(bid, profile);
    const tenderRuleChecks = await runTenderSpecificRules(bid._id, bid, tender);
    const { finalScore, riskLevel } = await calculateComplianceScore(bid._id);
    const recommendation = await generateRecommendation(bid._id);

    res.json({
      message: `${checks.length + tenderRuleChecks.length} compliance checks completed`,
      bidderId: bid._id,
      complianceScore: finalScore,
      riskLevel: riskLevel,
      aiRecommendation: recommendation,
      generalChecks: checks,
      tenderSpecificChecks: tenderRuleChecks,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


async function getChecksForBidder(req, res) {
  try {
    const bid = await BidSubmission.findById(req.params.id);
    if (!bid) return res.status(404).json({ error: "Bid not found" });

    const checks = await ComplianceCheck.find({
        $or: [
            { bidSubmission: req.params.id },
            { sellerProfile: bid.sellerProfile }
        ]
    }).sort({ createdAt: -1 });

    const latestChecks = [];
    const seenKeys = new Set();
    for (const check of checks) {
        const key = `${check.category}_${check.sourceName}`;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            latestChecks.push(check);
        }
    }
    
    // Sort them back alphabetically for consistent UI
    latestChecks.sort((a, b) => a.category.localeCompare(b.category));

    res.json(latestChecks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


async function getAuditTrail(req, res) {
  try {
    const bid = await BidSubmission.findById(req.params.id);
    if (!bid) return res.status(404).json({ error: "Bid not found" });

    const logs = await AuditLog.find({
        $or: [
            { bidSubmission: req.params.id },
            { sellerProfile: bid.sellerProfile }
        ]
    }).sort({ timestamp: 1 }); 
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


async function createBidderWithDocuments(req, res) {
  try {
    const { sellerProfileId, sellerProfileData, bidSubmissionData, documents } = req.body;

    let sellerProfile;
    if (sellerProfileId) {
        sellerProfile = await SellerProfile.findById(sellerProfileId);
    } else if (sellerProfileData && sellerProfileData.panNumber) {
        sellerProfile = await SellerProfile.findOne({ panNumber: sellerProfileData.panNumber });
    }
    
    if (!sellerProfile) {
        if (!sellerProfileData) throw new Error("Seller profile data required if no ID provided");
        sellerProfile = await SellerProfile.create(sellerProfileData);
    } else if (sellerProfileData) {
        Object.assign(sellerProfile, sellerProfileData);
        await sellerProfile.save();
    }

    bidSubmissionData.sellerProfile = sellerProfile._id;
    const bidSubmission = await BidSubmission.create(bidSubmissionData);

    await AuditLog.create({
      sellerProfile: sellerProfile._id,
      bidSubmission: bidSubmission._id,
      tender: bidSubmission.tender,
      actionType: "DOCUMENT_UPLOADED",
      actor: "system",
      actorRole: "SYSTEM",
      description: `Bid submission record created for ${sellerProfile.companyName} via document-based submission (${documents?.length || 0} documents)`,
    });

    const savedDocuments = [];
    for (const doc of documents || []) {
      const documentRecord = await Document.create({
        sellerProfile: sellerProfile._id,
        bidSubmission: doc.documentCategory === "TENDER_SPECIFIC" ? bidSubmission._id : null,
        documentCategory: doc.documentCategory || "REGISTRATION",
        docType: doc.docType,
        filePath: doc.tempFilePath,
        originalFilename: doc.originalFilename,
        extractedFields: doc.extractedFields,
        ocrConfidence: doc.ocrConfidence,
        verificationStatus: doc.verificationStatus,
      });
      savedDocuments.push(documentRecord);

      await AuditLog.create({
        sellerProfile: sellerProfile._id,
        bidSubmission: bidSubmission._id,
        actionType: "OCR_EXTRACTED",
        actor: "system",
        actorRole: "SYSTEM",
        description: `Document linked: ${doc.docType} (${doc.originalFilename})`,
        metadata: { extractedFields: doc.extractedFields },
      });
    }

    res.status(201).json({ bidSubmission, sellerProfile, documents: savedDocuments });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  createBidder,
  getBiddersByTender,
  getBidderById,
  runChecksForBidder,
  getChecksForBidder,
  getAuditTrail,
  createBidderWithDocuments,
};
