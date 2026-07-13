const express = require("express");
const router = express.Router();

const {
  registerCustomer,
  verifyOTP,
  resendOTP,
  loginCustomer,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
} = require("../controllers/customerController");

// REGISTER — body: { fname, lname, mobile, email, password }
router.post("/register", registerCustomer);

// VERIFY REGISTRATION OTP — body: { email, otp } — returns JWT on success
router.post("/verify-otp", verifyOTP);

// RESEND OTP — body: { email } OR { mobile }
router.post("/resend-otp", resendOTP);

// LOGIN — body: { identifier, password } — identifier = email or mobile
router.post("/login", loginCustomer);

// FORGOT PASSWORD FLOW
router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-otp", verifyForgotOTP);
router.post("/reset-password", resetPassword);

module.exports = router;
