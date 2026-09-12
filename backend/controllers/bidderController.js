const BidSubmission = require("../models/BidSubmission");
const SellerProfile = require("../models/SellerProfile");
const Tender = require("../models/Tender");
const ComplianceCheck = require("../models/ComplianceCheck");
const AuditLog = require("../models/AuditLog");
const Document = require("../models/Document");

const { runBidSubmissionChecks } = require("../services/verificationOrchestrator");
const { calculateComplianceScore } = require("../services/scoringEngine");

// Helper to check bid ownership for SELLERS
function isAuthorizedForBid(req, bid) {
    if (req.user.role === "SELLER") {
        const profileId = bid.sellerProfile._id ? bid.sellerProfile._id : bid.sellerProfile;
        return profileId.toString() === req.user.sellerProfileId.toString();
    }
    return true; // OFFICERS and ADMINS can access any bid
}

async function createBidder(req, res) {
  try {
    const { sellerProfileData, bidSubmissionData } = req.body;
    
    let sellerProfileId = req.user.sellerProfileId;

    if (req.user.role === "SELLER") {
        if (!sellerProfileId) return res.status(403).json({ error: "Seller profile required" });
    } else {
        // If officer is creating it manually for testing, they must pass panNumber or sellerProfileId
        if (req.body.sellerProfileId) {
            sellerProfileId = req.body.sellerProfileId;
        } else if (sellerProfileData && sellerProfileData.panNumber) {
            let sp = await SellerProfile.findOne({ panNumber: sellerProfileData.panNumber });
            if (!sp) sp = await SellerProfile.create(sellerProfileData);
            sellerProfileId = sp._id;
        } else {
            return res.status(400).json({ error: "Seller Profile identification required" });
        }
    }

    // Do not allow client to set restricted fields
    const safeBidData = {
        tender: bidSubmissionData.tender,
        sellerProfile: sellerProfileId,
        declaredTurnoverLakhs: bidSubmissionData.declaredTurnoverLakhs,
        declaredLocalContentPercent: bidSubmissionData.declaredLocalContentPercent,
        miiClass: bidSubmissionData.miiClass,
        isOemForOfferedCatalog: bidSubmissionData.isOemForOfferedCatalog,
        requestingEmdExemption: bidSubmissionData.requestingEmdExemption,
        emdExemptionCategory: bidSubmissionData.emdExemptionCategory
    };

    const bidSubmission = await BidSubmission.create(safeBidData);

    await AuditLog.create({
      sellerProfile: sellerProfileId,
      bidSubmission: bidSubmission._id,
      tender: bidSubmission.tender,
      actionType: "DOCUMENT_UPLOADED", 
      actor: req.user._id,
      actorRole: req.user.role,
      description: `Bid submission record created`,
    });

    res.status(201).json({ bidSubmission });
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

    if (!isAuthorizedForBid(req, bid)) return res.status(403).json({ error: "Forbidden: Cannot access another seller's bid" });

    const allDocs = await Document.find({
        bidSubmission: req.params.id
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
      const bid = await BidSubmission.findById(req.params.id).populate("tender sellerProfile");
      if (!bid) return res.status(404).json({ error: "Bid not found" });

      if (!isAuthorizedForBid(req, bid)) {
          return res.status(403).json({ error: "Forbidden: Cannot run checks for another seller's bid" });
      }

      const profile = bid.sellerProfile;
      const checks = await runBidSubmissionChecks(bid, profile);
      const { finalScore, riskLevel, recommendation } = await calculateComplianceScore(bid._id);

      res.json({
      message: `${checks.length} compliance checks completed`,
      bidderId: bid._id,
      complianceScore: finalScore,
      riskLevel: riskLevel,
      aiRecommendation: recommendation,
      generalChecks: checks,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


async function getChecksForBidder(req, res) {
  try {
    const bid = await BidSubmission.findById(req.params.id);
    if (!bid) return res.status(404).json({ error: "Bid not found" });

    if (!isAuthorizedForBid(req, bid)) return res.status(403).json({ error: "Forbidden" });

    const checks = await ComplianceCheck.find({
        $or: [
            { bidSubmission: req.params.id },
            { sellerProfile: bid.sellerProfile._id, bidSubmission: null },
            { sellerProfile: bid.sellerProfile._id, bidSubmission: { $exists: false } }
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

    if (!isAuthorizedForBid(req, bid)) return res.status(403).json({ error: "Forbidden" });

    const logs = await AuditLog.find({
        $or: [
            { bidSubmission: req.params.id },
            { sellerProfile: bid.sellerProfile._id, bidSubmission: null },
            { sellerProfile: bid.sellerProfile._id, bidSubmission: { $exists: false } }
        ]
    }).sort({ timestamp: -1 }); 
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


async function createBidderWithDocuments(req, res) {
  try {
    const { bidSubmissionData, documents } = req.body;

    let sellerProfileId = req.user.sellerProfileId;

    if (req.user.role === "SELLER") {
        if (!sellerProfileId) return res.status(403).json({ error: "Seller profile required" });
    } else {
        if (req.body.sellerProfileId) sellerProfileId = req.body.sellerProfileId;
        else return res.status(400).json({ error: "Seller Profile identification required" });
    }

    const safeBidData = {
        tender: bidSubmissionData.tender,
        sellerProfile: sellerProfileId,
        declaredTurnoverLakhs: bidSubmissionData.declaredTurnoverLakhs,
        declaredLocalContentPercent: bidSubmissionData.declaredLocalContentPercent,
        miiClass: bidSubmissionData.miiClass,
        isOemForOfferedCatalog: bidSubmissionData.isOemForOfferedCatalog,
        requestingEmdExemption: bidSubmissionData.requestingEmdExemption,
        emdExemptionCategory: bidSubmissionData.emdExemptionCategory
    };

    const bidSubmission = await BidSubmission.create(safeBidData);

    await AuditLog.create({
      sellerProfile: sellerProfileId,
      bidSubmission: bidSubmission._id,
      tender: bidSubmission.tender,
      actionType: "DOCUMENT_UPLOADED",
      actor: req.user._id,
      actorRole: req.user.role,
      description: `Bid submission record created via document-based submission (${documents?.length || 0} documents)`,
    });

    const savedDocuments = [];
    for (const doc of documents || []) {
      const documentRecord = await Document.create({
        sellerProfile: sellerProfileId,
        bidSubmission: doc.documentCategory === "TENDER_SPECIFIC" ? bidSubmission._id : null,
        documentCategory: doc.documentCategory || "REGISTRATION",
        docType: doc.docType,
        filePath: doc.tempFilePath, // WARNING: in a real app, verify this path belongs to this upload session and user!
        originalFilename: doc.originalFilename,
        extractedFields: doc.extractedFields,
        ocrConfidence: doc.ocrConfidence,
        verificationStatus: doc.verificationStatus,
      });
      savedDocuments.push(documentRecord);

      await AuditLog.create({
        sellerProfile: sellerProfileId,
        bidSubmission: bidSubmission._id,
        actionType: "OCR_EXTRACTED",
        actor: req.user._id,
        actorRole: req.user.role,
        description: `Document linked: ${doc.docType} (${doc.originalFilename})`,
        metadata: { extractedFields: doc.extractedFields },
      });
    }

    res.status(201).json({ bidSubmission, documents: savedDocuments });
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
