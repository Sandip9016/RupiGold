const express = require("express");

const { protect } = require("../middleware/authMiddleware");

const {
  registerVendor,
  verifyOTP,
  resendOTP,
  loginVendor,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
  deleteVendor,
  getAllVendors,
} = require("../controllers/vendorController");

router.post("/register", registerVendor);

router.post("/verify-otp", verifyOTP);

router.post("/resend-otp", resendOTP);

router.post("/login", loginVendor);

// FORGOT PASSWORD
router.post("/forgot-password", forgotPassword);

router.post("/verify-forgot-otp", verifyForgotOTP);

router.post("/reset-password", resetPassword);

// DELETE VENDOR
router.get("/delete/:email", deleteVendor);

// GET ALL VENDORS
router.get("/all", getAllVendors);

module.exports = router;
