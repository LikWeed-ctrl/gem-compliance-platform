const express = require("express");
const router = express.Router();
const { createTender, getTenders, getTenderById } = require("../controllers/tenderController");

router.post("/", createTender);
router.get("/", getTenders);
router.get("/:id", getTenderById);

module.exports = router;