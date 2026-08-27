const express = require("express");
const router = express.Router();
const {
  registerSellerProfile,
  loginSellerProfile,
} = require("../controllers/sellerProfileController");

router.post("/register", registerSellerProfile);
router.post("/login", loginSellerProfile);

module.exports = router;
