const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { validateFileMagicBytes } = require("../middleware/fileSecurity");
const { protect } = require("../middleware/authMiddleware");
const { uploadDocument, extractPreview, downloadDocument } = require("../controllers/documentController");

router.post("/", protect, upload.single("document"), validateFileMagicBytes, uploadDocument);
router.post("/extract-preview", protect, upload.single("document"), validateFileMagicBytes, extractPreview);
router.get("/:id/download", protect, downloadDocument);

module.exports = router;