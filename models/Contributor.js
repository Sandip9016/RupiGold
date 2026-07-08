const mongoose = require("mongoose");

const contributorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    profilePic: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    otp: {
      type: String,
      default: null,
    },

    otpExpiry: {
      type: Date,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // Fixed role marker — used by shared login/forgot-password flow
    // to know which collection this account belongs to.
    role: {
      type: String,
      enum: ["contributor"],
      default: "contributor",
      immutable: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Contributor", contributorSchema);
