const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  },
  { _id: false },
);

// One sub-order per vendor per checkout — lets each vendor fulfil
// and get paid out independently even though the customer paid once.
const subOrderSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
  },

  items: {
    type: [orderItemSchema],
    required: true,
  },

  subtotal: {
    type: Number,
    required: true,
  },

  fulfillmentStatus: {
    type: String,
    enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Processing",
  },

  // Amount owed to this vendor once platform settles. Currently
  // payoutAmount == subtotal (no platform commission cut yet — add
  // one here later if needed).
  payoutAmount: {
    type: Number,
    required: true,
  },

  // "Paid" is set by admin (manual settlement) today. Wire this to
  // PayU's real payout/marketplace-split API once the vendor's
  // sub-merchant KYC is done on PayU's side.
  payoutStatus: {
    type: String,
    enum: ["Pending", "Paid"],
    default: "Pending",
  },

  // Set when this subOrder is cancelled (by customer, before shipping).
  cancelReason: { type: String, default: null },
});

const orderSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    // Snapshot of the address at time of order — NOT a live ref, so
    // it stays correct even if the customer edits/deletes it later.
    deliveryAddress: {
      label: { type: String, default: "Home" },
      line1: { type: String, required: true },
      line2: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },

    subOrders: {
      type: [subOrderSchema],
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    // ── PAYU PAYMENT TRACKING ────────────────────────────────────
    payu: {
      txnId: { type: String, required: true, unique: true },
      mihpayid: { type: String, default: null }, // PayU's own txn id, set after callback
      status: {
        type: String,
        enum: ["Initiated", "Success", "Failed"],
        default: "Initiated",
      },
      mode: { type: String, default: null }, // e.g. CC, NB, UPI — returned by PayU
      isTestMode: { type: Boolean, default: true },
      rawResponse: { type: mongoose.Schema.Types.Mixed, default: null },

      // "Requested" set automatically when customer cancels a paid order.
      // "Refunded" is set by admin once money is actually sent back —
      // manual today, same pattern as payoutStatus. Wire to PayU's
      // refund API later if needed.
      refundStatus: {
        type: String,
        enum: ["None", "Requested", "Refunded"],
        default: "None",
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Order", orderSchema);
