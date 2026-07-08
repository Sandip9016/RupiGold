const express = require("express");
const router = express.Router();

const {
  registerContributor,
  verifyOTP,
  resendOTP,
  deleteContributor,
  getAllContributors,
} = require("../controllers/contributorController");

const { profilePicUpload } = require("../middleware/uploadMiddleware");

// REGISTER — name, email, phone, profilePic (file), country, password
router.post("/register", profilePicUpload.single("profilePic"), registerContributor);

router.post("/verify-otp", verifyOTP);

router.post("/resend-otp", resendOTP);

// NOTE: Login and forgot-password now live under the shared
// role-based auth API — see /api/auth/login, /api/auth/forgot-password,
// /api/auth/verify-forgot-otp, /api/auth/reset-password (pass role: "contributor").

// DELETE CONTRIBUTOR
router.get("/delete/:email", deleteContributor);

// GET ALL CONTRIBUTORS
router.get("/all", getAllContributors);

module.exports = router;
