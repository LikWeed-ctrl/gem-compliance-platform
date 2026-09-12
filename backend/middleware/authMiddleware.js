const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to authenticate JWT
async function protect(req, res, next) {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_for_prototype");
            
            req.user = await User.findById(decoded.id).select("-password");
            if (!req.user) {
                return res.status(401).json({ error: "Not authorized, user deleted" });
            }
            
            next();
        } catch (error) {
            console.error("Token verification failed:", error.message);
            return res.status(401).json({ error: "Not authorized, token failed" });
        }
    } else {
        return res.status(401).json({ error: "Not authorized, no token" });
    }
}

// Middleware to authorize specific roles
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden, insufficient role access" });
        }
        next();
    };
}

module.exports = { protect, authorize };
