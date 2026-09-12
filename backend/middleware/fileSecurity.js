const fs = require("fs");
const path = require("path");

const MAGIC_NUMBERS = {
    pdf: "25504446", // %PDF
    jpeg: "ffd8ffe0",
    jpg: "ffd8ffe0",
    png: "89504e47"
};

function validateFileMagicBytes(req, res, next) {
    if (!req.file) return next();

    const filePath = req.file.path;
    try {
        const buffer = Buffer.alloc(4);
        const fd = fs.openSync(filePath, "r");
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);

        const hex = buffer.toString("hex").toLowerCase();
        
        let isValid = false;
        if (req.file.mimetype === "application/pdf" && hex === MAGIC_NUMBERS.pdf) isValid = true;
        if ((req.file.mimetype === "image/jpeg" || req.file.mimetype === "image/jpg") && (hex.startsWith("ffd8ff"))) isValid = true;
        if (req.file.mimetype === "image/png" && hex === MAGIC_NUMBERS.png) isValid = true;

        if (!isValid) {
            fs.unlinkSync(filePath); // delete fake file
            return res.status(400).json({ error: "Invalid file content. File type does not match extension/mimetype." });
        }

        next();
    } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(500).json({ error: "Error reading uploaded file" });
    }
}

module.exports = { validateFileMagicBytes };
