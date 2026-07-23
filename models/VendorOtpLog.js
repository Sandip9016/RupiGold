const mongoose = require("mongoose");

const vendorOtpLogSchema = new mongoose.Schema(
  {
    // Mobile number OR email the OTP was sent to
    identifier: {
      type: String,
      required: true,
      index: true,
    },

    otp: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["mobile_verify", "email_verify", "forgot_password"],
      required: true,
    },

    expires_at: {
      type: Date,
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    verified_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("VendorOtpLog", vendorOtpLogSchema);
