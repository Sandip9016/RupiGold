const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    productImage: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    purity: {
      type: String,
      trim: true,
      default: null,
    },

    weight: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: ["stock", "not in stock"],
      default: "stock",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Product", productSchema);
