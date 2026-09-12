const User = require("../models/User");
const SellerProfile = require("../models/SellerProfile");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret_for_prototype", {
        expiresIn: "30d",
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
async function registerUser(req, res) {
    try {
        const { email, password, role, companyName, panNumber } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: "User already exists" });
        }

        let sellerProfileId = null;

        // If registering as SELLER, create a basic seller profile
        if (role === "SELLER") {
            if (!companyName || !panNumber) {
                return res.status(400).json({ error: "companyName and panNumber are required for sellers" });
            }
            
            // For prototype simplicity, create SellerProfile directly
            const seller = await SellerProfile.create({
                companyName,
                panNumber
            });
            sellerProfileId = seller._id;
        }

        const user = await User.create({
            email,
            password,
            role: role === "OFFICER" ? "OFFICER" : "SELLER",
            sellerProfileId
        });

        res.status(201).json({
            _id: user._id,
            email: user.email,
            role: user.role,
            sellerProfileId: user.sellerProfileId,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                email: user.email,
                role: user.role,
                sellerProfileId: user.sellerProfileId,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ error: "Invalid email or password" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
async function getMe(req, res) {
    res.json({
        _id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        sellerProfileId: req.user.sellerProfileId,
    });
}

module.exports = { registerUser, loginUser, getMe };
