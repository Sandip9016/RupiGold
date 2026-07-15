const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    // Price snapshot at the time item was added — protects the
    // customer from a mid-cart price change by the vendor, and is
    // what actually gets charged at checkout.
    priceAtAdd: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
    },

    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Cart", cartSchema);
