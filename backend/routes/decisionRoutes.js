const express = require("express");
const router = express.Router();
const { recordOfficerDecision } = require("../controllers/decisionController");

router.post("/:id/decision", recordOfficerDecision);

module.exports = router;