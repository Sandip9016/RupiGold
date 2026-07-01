const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    businessType: {
      type: String,
      enum: ["Individual", "Proprietorship", "Partnership", "Pvt Ltd"],
      required: true,
    },

    ownerDirectorName: {
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

    address: {
      type: String,
      required: true,
    },

    pincode: {
      type: String,
      required: true,
    },

    mobileNumber: {
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
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
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
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Vendor", vendorSchema);
