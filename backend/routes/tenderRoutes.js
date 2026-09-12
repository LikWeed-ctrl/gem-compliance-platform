const express = require("express");
const router = express.Router();
const { createTender, getTenders, getTenderById } = require("../controllers/tenderController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/", protect, authorize("OFFICER", "ADMIN"), createTender);
router.get("/", getTenders); // Keep public for demo/reading
router.get("/:id", getTenderById);

module.exports = router;