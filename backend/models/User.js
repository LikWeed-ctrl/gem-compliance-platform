const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["SELLER", "OFFICER", "ADMIN"], default: "SELLER" },
        // For sellers, map to a SellerProfile
        sellerProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "SellerProfile", default: null }
    },
    { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function() {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
