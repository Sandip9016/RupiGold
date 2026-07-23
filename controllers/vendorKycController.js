const Vendor = require("../models/Vendor");
const VendorDocument = require("../models/VendorDocument");
const {
  verifyPanWithSurepass,
  verifyGstWithMastersIndia,
  verifyBankAccountWithCashfree,
} = require("../services/kycVerificationService");

/**
 * Upsert a VendorDocument row for a given doc_type.
 * Re-upload replaces the previous file for that doc_type (per the
 * unique vendor_id + doc_type index on the model).
 */
const saveDocument = async (vendorId, docType, fileUrl, extra = {}) => {
  return VendorDocument.findOneAndUpdate(
    { vendor_id: vendorId, doc_type: docType },
    {
      vendor_id: vendorId,
      doc_type: docType,
      file_url: fileUrl,
      ...extra,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const bumpKycStep = async (vendor, step) => {
  if (vendor.kyc_step < step) {
    vendor.kyc_step = step;
  }
};

/**
 * ── STEP 1a: PAN — upload + auto-verify (Surepass) ──────────────
 * POST /api/vendor/kyc/pan
 * multipart: file=<pan card image/pdf>, body: { pan_no }
 * Auth: vendorProtect
 */
const uploadPan = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { pan_no } = req.body;

    if (!pan_no) {
      return res
        .status(400)
        .json({ success: false, message: "pan_no is required" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "PAN card file is required" });
    }

    const fileUrl = req.file.path || req.file.secure_url;

    await saveDocument(vendorId, "pan_card", fileUrl);

    const result = await verifyPanWithSurepass(pan_no);

    const vendor = await Vendor.findById(vendorId);
    vendor.pan_no = pan_no;
    vendor.pan_verified = result.verified;
    await bumpKycStep(vendor, 1);
    await vendor.save();

    if (result.error) {
      console.log("⚠️ Surepass PAN verify error (non-blocking):", result.error);
    }

    res.status(200).json({
      success: true,
      message: result.verified
        ? "PAN uploaded and auto-verified"
        : "PAN uploaded — auto-verify failed, will need manual review",
      pan_verified: result.verified,
    });
  } catch (error) {
    console.log("❌ Upload PAN Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * ── STEP 1b: GST — upload + auto-verify (MastersIndia) ──────────
 * POST /api/vendor/kyc/gst
 * multipart: file=<gst cert>, body: { gst_no }
 */
const uploadGst = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { gst_no } = req.body;

    if (!gst_no) {
      return res
        .status(400)
        .json({ success: false, message: "gst_no is required" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "GST certificate file is required" });
    }

    const fileUrl = req.file.path || req.file.secure_url;

    await saveDocument(vendorId, "gst_cert", fileUrl);

    const result = await verifyGstWithMastersIndia(gst_no);

    const vendor = await Vendor.findById(vendorId);
    vendor.gst_no = gst_no;
    vendor.gst_verified = result.verified;
    await vendor.save();

    if (result.error) {
      console.log(
        "⚠️ MastersIndia GST verify error (non-blocking):",
        result.error,
      );
    }

    res.status(200).json({
      success: true,
      message: result.verified
        ? "GST uploaded and auto-verified"
        : "GST uploaded — auto-verify failed, will need manual review",
      gst_verified: result.verified,
    });
  } catch (error) {
    console.log("❌ Upload GST Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * ── STEP 1c: Business type proof (Shop Act / COI) ────────────────
 * POST /api/vendor/kyc/business-proof
 * multipart: file, body: { proof_type: "shop_act" | "coi_certificate" }
 */
const uploadBusinessProof = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { proof_type } = req.body;

    if (!["shop_act", "coi_certificate"].includes(proof_type)) {
      return res.status(400).json({
        success: false,
        message: "proof_type must be shop_act or coi_certificate",
      });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Proof file is required" });
    }

    const fileUrl = req.file.path || req.file.secure_url;
    await saveDocument(vendorId, proof_type, fileUrl);

    const vendor = await Vendor.findById(vendorId);
    await bumpKycStep(vendor, 1);
    await vendor.save();

    res.status(200).json({ success: true, message: "Business proof uploaded" });
  } catch (error) {
    console.log("❌ Upload Business Proof Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * ── STEP 2a: Bank details (holder name, acc no, IFSC, bank name) ─
 * POST /api/vendor/kyc/bank-details
 * body: { bank_holder_name, bank_acc_no, ifsc, bank_name }
 */
const submitBankDetails = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { bank_holder_name, bank_acc_no, ifsc, bank_name } = req.body;

    if (!bank_holder_name || !bank_acc_no || !ifsc || !bank_name) {
      return res.status(400).json({
        success: false,
        message:
          "bank_holder_name, bank_acc_no, ifsc and bank_name are all required",
      });
    }

    const vendor = await Vendor.findById(vendorId);

    // Client requirement: account holder name must match PAN name
    if (
      vendor.name &&
      bank_holder_name.trim().toLowerCase() !== vendor.name.trim().toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        message: "Account holder name must match the PAN name on record",
      });
    }

    vendor.bank_holder_name = bank_holder_name;
    vendor.bank_acc_no = bank_acc_no;
    vendor.ifsc = ifsc;
    vendor.bank_name = bank_name;
    vendor.bank_verified = false; // reset — needs fresh penny-drop
    await vendor.save();

    res.status(200).json({ success: true, message: "Bank details saved" });
  } catch (error) {
    console.log("❌ Submit Bank Details Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * ── STEP 2b: Upload cancelled cheque / passbook first page ──────
 * POST /api/vendor/kyc/cancelled-cheque
 * multipart: file
 */
const uploadCancelledCheque = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Cheque/passbook file is required" });
    }

    const fileUrl = req.file.path || req.file.secure_url;
    await saveDocument(vendorId, "cancelled_cheque", fileUrl);

    res
      .status(200)
      .json({ success: true, message: "Cancelled cheque uploaded" });
  } catch (error) {
    console.log("❌ Upload Cancelled Cheque Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * ── STEP 2c: Penny-drop bank verify (Cashfree) ───────────────────
 * POST /api/vendor/kyc/penny-drop
 */
const pennyDropVerify = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const vendor = await Vendor.findById(vendorId);

    if (!vendor.bank_acc_no || !vendor.ifsc || !vendor.bank_holder_name) {
      return res.status(400).json({
        success: false,
        message: "Submit bank details before running penny-drop verify",
      });
    }

    const result = await verifyBankAccountWithCashfree({
      bankAccountNumber: vendor.bank_acc_no,
      ifsc: vendor.ifsc,
      accountHolderName: vendor.bank_holder_name,
    });

    vendor.bank_verified = result.verified;
    await bumpKycStep(vendor, 2);
    await vendor.save();

    if (result.error) {
      console.log("⚠️ Cashfree penny-drop error (non-blocking):", result.error);
    }

    res.status(200).json({
      success: true,
      message: result.verified
        ? "Bank account verified via penny-drop"
        : "Penny-drop verification failed — check account details",
      bank_verified: result.verified,
    });
  } catch (error) {
    console.log("❌ Penny Drop Verify Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * ── STEP 3a: BIS Hallmark license — upload + number ──────────────
 * POST /api/vendor/kyc/bis-license
 * multipart: file, body: { bis_license_no }
 */
const uploadBisLicense = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { bis_license_no } = req.body;

    if (!bis_license_no) {
      return res
        .status(400)
        .json({ success: false, message: "bis_license_no is required" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "BIS license file is required" });
    }

    const fileUrl = req.file.path || req.file.secure_url;
    await saveDocument(vendorId, "bis_license", fileUrl);

    const vendor = await Vendor.findById(vendorId);
    vendor.bis_license_no = bis_license_no;
    await vendor.save();

    res.status(200).json({ success: true, message: "BIS license uploaded" });
  } catch (error) {
    console.log("❌ Upload BIS License Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * ── STEP 3b: Shop photos (3 mandatory, geo-tagged) ───────────────
 * POST /api/vendor/kyc/shop-photos
 * multipart fields: shop_photo_1, shop_photo_2, shop_photo_3
 * body: { latitude, longitude }  — geo-tag applied to all 3
 * (client requirement: board photo, counter photo, owner selfie —
 * caller decides which file goes in which slot; all 3 mandatory)
 */
const uploadShopPhotos = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { latitude, longitude } = req.body;

    const files = req.files || {};
    const slots = ["shop_photo_1", "shop_photo_2", "shop_photo_3"];
    const missing = slots.filter((slot) => !files[slot]?.[0]);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `All 3 shop photos are mandatory. Missing: ${missing.join(", ")}`,
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required (geo-tag mandatory)",
      });
    }

    for (const slot of slots) {
      const file = files[slot][0];
      const fileUrl = file.path || file.secure_url;
      await saveDocument(vendorId, slot, fileUrl, {
        geo_lat: Number(latitude),
        geo_lng: Number(longitude),
      });
    }

    const vendor = await Vendor.findById(vendorId);
    await bumpKycStep(vendor, 3);
    await vendor.save();

    res.status(200).json({ success: true, message: "Shop photos uploaded" });
  } catch (error) {
    console.log("❌ Upload Shop Photos Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * ── STEP 4a: Aadhaar — upload masked Aadhaar + number ────────────
 * POST /api/vendor/kyc/aadhaar
 * multipart: file, body: { aadhaar_no }
 * NOTE: eKYC (OTP-based Aadhaar auto-verify) is optional per client
 * spec — not wired to Surepass Aadhaar eKYC here; document upload
 * only. Add verification later if the client confirms they want it.
 */
const uploadAadhaar = async (req, res) => {
  try {
    const vendorId = req.vendor._id;
    const { aadhaar_no } = req.body;

    if (!aadhaar_no) {
      return res
        .status(400)
        .json({ success: false, message: "aadhaar_no is required" });
    }
    if (!/^\d{12}$/.test(aadhaar_no)) {
      return res
        .status(400)
        .json({ success: false, message: "aadhaar_no must be 12 digits" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Masked Aadhaar file is required" });
    }

    const fileUrl = req.file.path || req.file.secure_url;
    await saveDocument(vendorId, "aadhaar_masked", fileUrl);

    const vendor = await Vendor.findById(vendorId);
    // Store masked — last 4 digits only, matches "Masked Aadhaar" spec
    vendor.aadhaar_no = `XXXXXXXX${aadhaar_no.slice(-4)}`;
    await vendor.save();

    res.status(200).json({ success: true, message: "Aadhaar uploaded" });
  } catch (error) {
    console.log("❌ Upload Aadhaar Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * ── STEP 4b: Owner photo (passport size) ─────────────────────────
 * POST /api/vendor/kyc/owner-photo
 * multipart: file
 */
const uploadOwnerPhoto = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Owner photo file is required" });
    }

    const fileUrl = req.file.path || req.file.secure_url;
    await saveDocument(vendorId, "owner_photo", fileUrl);

    const vendor = await Vendor.findById(vendorId);
    await bumpKycStep(vendor, 4);

    // All 4 steps done → move vendor into under_review for admin
    if (vendor.kyc_step >= 4 && vendor.status === "pending") {
      vendor.status = "under_review";
      vendor.kyc_submitted_at = new Date();
    }
    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Owner photo uploaded. KYC submitted for review.",
      kyc_step: vendor.kyc_step,
      status: vendor.status,
    });
  } catch (error) {
    console.log("❌ Upload Owner Photo Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

/**
 * ── GET KYC STATUS — vendor's own progress + all uploaded docs ──
 * GET /api/vendor/kyc/status
 */
const getKycStatus = async (req, res) => {
  try {
    const vendorId = req.vendor._id;

    const vendor = await Vendor.findById(vendorId).select(
      "pan_no pan_verified gst_no gst_verified bank_holder_name bank_name bank_acc_no ifsc bank_verified bis_license_no aadhaar_no aadhaar_verified kyc_step status",
    );

    const documents = await VendorDocument.find({ vendor_id: vendorId }).select(
      "doc_type file_url verified verified_at geo_lat geo_lng",
    );

    res.status(200).json({
      success: true,
      vendor,
      documents,
    });
  } catch (error) {
    console.log("❌ Get KYC Status Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

module.exports = {
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
};
