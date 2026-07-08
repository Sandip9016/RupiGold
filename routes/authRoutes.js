const express = require("express");
const router = express.Router();

const {
  login,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
} = require("../controllers/authController");

// SHARED LOGIN — body: { email, password, role: "vendor" | "contributor" }
router.post("/login", login);

// SHARED FORGOT PASSWORD FLOW — role is required at every step
router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOTP);
router.post("/reset-password", resetPassword);

module.exports = router;
