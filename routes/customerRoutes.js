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
  getProfile,
  updateProfile,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require("../controllers/customerController");

const { customerProtect } = require("../middleware/authMiddleware");

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

// PROFILE — Protected, Customer only
// GET returns personal details, PUT updates fname/lname/mobile/email (any subset)
router.get("/profile", customerProtect, getProfile);
router.put("/profile", customerProtect, updateProfile);

// ADDRESS BOOK — Protected, Customer only (max 2 addresses: 1 primary + 1 secondary)
router.post("/address", customerProtect, addAddress);
router.get("/address", customerProtect, getAddresses);
router.put("/address/:addressId", customerProtect, updateAddress);
router.delete("/address/:addressId", customerProtect, deleteAddress);
router.put("/address/:addressId/default", customerProtect, setDefaultAddress);

module.exports = router;
