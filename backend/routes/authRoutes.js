const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 login requests per windowMs
    message: { error: "Too many login attempts, please try again later." }
});

router.post("/register", registerUser);
router.post("/login", loginLimiter, loginUser);
router.get("/me", protect, getMe);

module.exports = router;
