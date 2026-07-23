const express = require("express");
const router = express.Router();

const { vendorProtect } = require("../middleware/authMiddleware");
const { vendorKycUpload } = require("../middleware/uploadMiddleware");

const {
  uploadPan,
  uploadGst,
  uploadBusinessProof,
  submitBankDetails,
  uploadCancelledCheque,
  pennyDropVerify,
  uploadBisLicense,
  uploadShopPhotos,
  uploadAadhaar,
  uploadOwnerPhoto,
  getKycStatus,
} = require("../controllers/vendorKycController");

// ── STEP 1: BUSINESS KYC ─────────────────────────────────────
router.post("/pan", vendorProtect, vendorKycUpload.single("file"), uploadPan);
router.post("/gst", vendorProtect, vendorKycUpload.single("file"), uploadGst);
router.post(
  "/business-proof",
  vendorProtect,
  vendorKycUpload.single("file"),
  uploadBusinessProof,
);

// ── STEP 2: BANK VERIFICATION ────────────────────────────────
router.post("/bank-details", vendorProtect, submitBankDetails);
router.post(
  "/cancelled-cheque",
  vendorProtect,
  vendorKycUpload.single("file"),
  uploadCancelledCheque,
);
router.post("/penny-drop", vendorProtect, pennyDropVerify);

// ── STEP 3: GOLD BUSINESS PROOF ──────────────────────────────
router.post(
  "/bis-license",
  vendorProtect,
  vendorKycUpload.single("file"),
  uploadBisLicense,
);
router.post(
  "/shop-photos",
  vendorProtect,
  vendorKycUpload.fields([
    { name: "shop_photo_1", maxCount: 1 },
    { name: "shop_photo_2", maxCount: 1 },
    { name: "shop_photo_3", maxCount: 1 },
  ]),
  uploadShopPhotos,
);

// ── STEP 4: IDENTITY PROOF ───────────────────────────────────
router.post(
  "/aadhaar",
  vendorProtect,
  vendorKycUpload.single("file"),
  uploadAadhaar,
);
router.post(
  "/owner-photo",
  vendorProtect,
  vendorKycUpload.single("file"),
  uploadOwnerPhoto,
);

// ── STATUS ────────────────────────────────────────────────────
router.get("/status", vendorProtect, getKycStatus);

module.exports = router;
