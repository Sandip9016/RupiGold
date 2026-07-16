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

    // 2 to 5 product photos — Cloudinary secure_urls.
    productImages: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) && arr.length >= 2 && arr.length <= 5,
        message: "A product needs between 2 and 5 images",
      },
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

    // Total units available for sale.
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // Units currently sitting in customer carts (not yet paid for).
    // Available-to-buy = quantity - reservedQuantity.
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Product", productSchema);
