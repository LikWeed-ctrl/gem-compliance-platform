const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");

const {
  createBidder,
  getBiddersByTender,
  getBidderById,
  runChecksForBidder,
  getChecksForBidder,
  getAuditTrail,
  createBidderWithDocuments,
} = require("../controllers/bidderController");

const checksLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // limit to 20 calls
    message: { error: "Too many verification attempts, please try again later." }
});

router.post("/", protect, authorize("SELLER", "OFFICER"), createBidder);
router.get("/tender/:tenderId", protect, authorize("OFFICER", "ADMIN"), getBiddersByTender);
router.get("/:id", protect, authorize("SELLER", "OFFICER", "ADMIN"), getBidderById);
router.post("/:id/run-checks", protect, authorize("SELLER", "OFFICER", "ADMIN"), checksLimiter, runChecksForBidder);
router.get("/:id/checks", protect, authorize("SELLER", "OFFICER", "ADMIN"), getChecksForBidder);
router.get("/:id/audit-trail", protect, authorize("SELLER", "OFFICER", "ADMIN"), getAuditTrail);
router.post("/with-documents", protect, authorize("SELLER", "OFFICER"), createBidderWithDocuments);

module.exports = router;