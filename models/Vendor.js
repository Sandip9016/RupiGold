const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    business_name: {
      type: String,
      required: true,
      trim: true,
    },

    businessType: {
      type: String,
      enum: ["Individual", "Company", "Pvt Ltd"],
      required: true,
    },

    referral_code: {
      type: String,
      default: null,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    shop_address: {
      type: String,
      required: true,
    },

    pincode: {
      type: String,
      required: true,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    otp: {
      type: String,
    },

    otpExpiry: {
      type: Date,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // ── ADMIN APPROVAL WORKFLOW ────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected", "banned"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    // One-time secure token used for the "Accept" link inside the
    // admin-notification email (so admin can approve with a single click)
    approvalToken: {
      type: String,
      default: null,
    },

    kyc_submitted_at: {
      type: Date,
      default: null,
    },

    approved_at: {
      type: Date,
      default: null,
    },

    // ── PAYOUT / SETTLEMENT (PayU) ───────────────────────────────
    // NOTE: True automated marketplace split-payment requires the
    // vendor to be onboarded as a sub-merchant on PayU's dashboard
    // (separate KYC done directly with PayU, outside this app).
    // Until payoutKycStatus is "Verified", vendor payouts are tracked
    // here but settled manually by admin — see SubOrder.payoutStatus.
    payoutKycStatus: {
      type: String,
      enum: ["Not Submitted", "Pending", "Verified", "Rejected"],
      default: "Not Submitted",
    },

    payuSellerId: {
      type: String,
      default: null,
    },

    // ── KYC / BUSINESS VERIFICATION ────────────────────────────
    pan_no: {
      type: String,
      default: null,
    },

    pan_verified: {
      type: Boolean,
      default: false,
    },

    gst_no: {
      type: String,
      default: null,
    },

    gst_verified: {
      type: Boolean,
      default: false,
    },

    bank_holder_name: {
      type: String,
      default: null,
    },

    bank_name: {
      type: String,
      default: null,
    },

    bank_acc_no: {
      type: String,
      default: null,
    },

    ifsc: {
      type: String,
      default: null,
    },

    bank_verified: {
      type: Boolean,
      default: false,
    },

    bis_license_no: {
      type: String,
      default: null,
    },

    aadhaar_no: {
      type: String,
      default: null,
    },

    aadhaar_verified: {
      type: Boolean,
      default: false,
    },

    // Tracks furthest KYC step completed: 0 = not started, 1-4 = step done
    kyc_step: {
      type: Number,
      default: 0,
      min: 0,
      max: 4,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Vendor", vendorSchema);
