const express = require("express");
const router = express.Router();
const { recordOfficerDecision } = require("../controllers/decisionController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Only OFFICER or ADMIN can make decisions
router.post("/:id/decision", protect, authorize("OFFICER", "ADMIN"), recordOfficerDecision);

module.exports = router;