const express = require("express");
const router = express.Router();

const {
  registerVendor,
  verifyOTP,
  resendOTP,
  deleteVendor,
  getAllVendors,
} = require("../controllers/vendorController");

router.post("/register", registerVendor);

router.post("/verify-otp", verifyOTP);

router.post("/resend-otp", resendOTP);

// NOTE: Login and forgot-password now live under the shared
// role-based auth API — see /api/auth/login, /api/auth/forgot-password,
// /api/auth/verify-forgot-otp, /api/auth/reset-password (pass role: "vendor").

// DELETE VENDOR
router.get("/delete/:email", deleteVendor);

// GET ALL VENDORS
router.get("/all", getAllVendors);

module.exports = router;
