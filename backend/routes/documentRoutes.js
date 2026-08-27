const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { uploadDocument, extractPreview } = require("../controllers/documentController");

router.post("/", upload.single("document"), uploadDocument);
router.post("/extract-preview", upload.single("document"), extractPreview);

module.exports = router;