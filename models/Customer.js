const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    fname: {
      type: String,
      required: true,
      trim: true,
    },

    lname: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
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

    // Fixed role marker — used by JWT payload / role-based middleware
    // to distinguish Customer accounts from Vendor/Contributor/Admin.
    role: {
      type: String,
      enum: ["customer"],
      default: "customer",
      immutable: true,
    },

    // ── SAVED DELIVERY ADDRESSES ────────────────────────────────
    addresses: {
      type: [
        {
          label: { type: String, trim: true, default: "Home" },
          line1: { type: String, required: true, trim: true },
          line2: { type: String, trim: true, default: "" },
          city: { type: String, required: true, trim: true },
          state: { type: String, required: true, trim: true },
          pincode: { type: String, required: true, trim: true },
          isDefault: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Customer", customerSchema);
