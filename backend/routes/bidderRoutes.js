const express = require("express");
const router = express.Router();
const {
  createBidder,
  getBiddersByTender,
  getBidderById,
  runChecksForBidder,
  getChecksForBidder,
  getAuditTrail,
  createBidderWithDocuments,
} = require("../controllers/bidderController");

router.post("/", createBidder);
router.get("/tender/:tenderId", getBiddersByTender);
router.get("/:id", getBidderById);
router.post("/:id/run-checks", runChecksForBidder);
router.get("/:id/checks", getChecksForBidder);
router.get("/:id/audit-trail", getAuditTrail);
router.post("/with-documents", createBidderWithDocuments);

module.exports = router;