const crypto = require("crypto");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const payu = require("../utils/payu");

const FRONTEND_SUCCESS_URL =
  process.env.FRONTEND_SUCCESS_URL || "http://localhost:3000/order/success";
const FRONTEND_FAILURE_URL =
  process.env.FRONTEND_FAILURE_URL || "http://localhost:3000/order/failure";

// ── HELPER — release every reservation held by a cart's items ───
const releaseCartReservations = async (cart) => {
  await Promise.all(
    cart.items.map((item) =>
      Product.findByIdAndUpdate(item.productId, {
        $inc: { reservedQuantity: -item.quantity },
      }),
    ),
  );
};

/**
 * CHECKOUT — creates the Order (Initiated) + splits into per-vendor
 * subOrders, returns the PayU form params the frontend must
 * auto-submit (PayU requires a real HTML form POST from the browser,
 * not a fetch/JSON call).
 *
 * POST /api/order/checkout
 * body: { addressId }  OR  { address: {label,line1,line2,city,state,pincode} }
 * Protected — Customer only
 */
const checkout = async (req, res) => {
  try {
    const { addressId, address } = req.body;

    const cart = await Cart.findOne({ customerId: req.customer._id }).populate(
      "items.productId",
      "productName price vendorId",
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    // ── RESOLVE DELIVERY ADDRESS ────────────────────────────────
    let deliveryAddress;
    if (addressId) {
      const saved = req.customer.addresses.id(addressId);
      if (!saved) {
        return res.status(400).json({
          success: false,
          message: "Saved address not found",
        });
      }
      deliveryAddress = {
        label: saved.label,
        line1: saved.line1,
        line2: saved.line2,
        city: saved.city,
        state: saved.state,
        pincode: saved.pincode,
      };
    } else if (address) {
      const { line1, city, state, pincode } = address;
      if (!line1 || !city || !state || !pincode) {
        return res.status(400).json({
          success: false,
          message: "line1, city, state and pincode are required",
        });
      }
      deliveryAddress = {
        label: address.label || "Home",
        line1,
        line2: address.line2 || "",
        city,
        state,
        pincode,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide addressId (saved address) or address (new address)",
      });
    }

    // ── GROUP CART ITEMS BY VENDOR → SUBORDERS ──────────────────
    const vendorGroups = {};
    for (const item of cart.items) {
      const vId = item.vendorId.toString();
      if (!vendorGroups[vId]) vendorGroups[vId] = [];
      vendorGroups[vId].push(item);
    }

    const subOrders = Object.entries(vendorGroups).map(([vendorId, items]) => {
      const orderItems = items.map((item) => ({
        productId: item.productId._id,
        productName: item.productId.productName,
        price: item.priceAtAdd,
        quantity: item.quantity,
        subtotal: item.priceAtAdd * item.quantity,
      }));
      const subtotal = orderItems.reduce((s, i) => s + i.subtotal, 0);

      return {
        vendorId,
        items: orderItems,
        subtotal,
        payoutAmount: subtotal, // no platform commission cut applied yet
      };
    });

    const totalAmount = subOrders.reduce((s, so) => s + so.subtotal, 0);

    const txnid = `RG${Date.now()}${crypto.randomBytes(4).toString("hex")}`;

    const order = await Order.create({
      customerId: req.customer._id,
      deliveryAddress,
      subOrders,
      totalAmount,
      payu: {
        txnId: txnid,
        status: "Initiated",
        isTestMode: payu.PAYU_MODE !== "LIVE",
      },
    });

    console.log("=================================");
    console.log("📥 CHECKOUT INITIATED — Order:", order._id, "Txn:", txnid);
    console.log("💰 Amount:", totalAmount, "| PayU mode:", payu.PAYU_MODE);
    console.log("=================================");

    const amount = totalAmount.toFixed(2);
    const productinfo = `RupiGold Order ${order._id}`;
    const firstname = req.customer.fname;
    const email = req.customer.email;
    const phone = req.customer.mobile;

    const hash = payu.generateHash({
      txnid,
      amount,
      productinfo,
      firstname,
      email,
    });

    const backendUrl =
      process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;

    res.status(201).json({
      success: true,
      message: "Order created — submit these params to PayU to pay",
      orderId: order._id,
      payuAction: payu.PAYU_BASE_URL,
      payuParams: {
        key: payu.PAYU_KEY,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        surl: `${backendUrl}/api/order/payu/success`,
        furl: `${backendUrl}/api/order/payu/failure`,
        hash,
      },
    });
  } catch (error) {
    console.log("❌ Checkout Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * PAYU SUCCESS CALLBACK
 * POST /api/order/payu/success  (PayU posts form-urlencoded here — public, no auth)
 * Verifies reverse-hash before trusting anything in the payload.
 */
const payuSuccess = async (req, res) => {
  try {
    const payload = req.body;
    console.log("=================================");
    console.log("📥 PAYU SUCCESS CALLBACK — txnid:", payload.txnid);
    console.log("=================================");

    const order = await Order.findOne({ "payu.txnId": payload.txnid });
    if (!order) {
      console.log("❌ Order not found for txnid:", payload.txnid);
      return res.redirect(`${FRONTEND_FAILURE_URL}?reason=order_not_found`);
    }

    const hashValid = payu.verifyReverseHash(payload);

    if (!hashValid || payload.status !== "success") {
      console.log("❌ Hash mismatch or non-success status from PayU");
      order.payu.status = "Failed";
      order.payu.rawResponse = payload;
      await order.save();

      const cart = await Cart.findOne({ customerId: order.customerId });
      if (cart) await releaseCartReservations(cart);

      return res.redirect(`${FRONTEND_FAILURE_URL}?orderId=${order._id}`);
    }

    // ── PAYMENT CONFIRMED — COMMIT STOCK, CLEAR CART ────────────
    order.payu.status = "Success";
    order.payu.mihpayid = payload.mihpayid || null;
    order.payu.mode = payload.mode || null;
    order.payu.rawResponse = payload;
    await order.save();

    for (const subOrder of order.subOrders) {
      for (const item of subOrder.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: -item.quantity, reservedQuantity: -item.quantity },
        });
      }
    }

    await Cart.findOneAndUpdate(
      { customerId: order.customerId },
      { items: [] },
    );

    console.log("✅ Order paid & stock committed:", order._id);

    return res.redirect(`${FRONTEND_SUCCESS_URL}?orderId=${order._id}`);
  } catch (error) {
    console.log("❌ PayU Success Callback Error:", error.message);
    return res.redirect(`${FRONTEND_FAILURE_URL}?reason=server_error`);
  }
};

/**
 * PAYU FAILURE CALLBACK
 * POST /api/order/payu/failure — public, no auth
 */
const payuFailure = async (req, res) => {
  try {
    const payload = req.body;
    console.log("=================================");
    console.log("📥 PAYU FAILURE CALLBACK — txnid:", payload.txnid);
    console.log("=================================");

    const order = await Order.findOne({ "payu.txnId": payload.txnid });
    if (order && order.payu.status === "Initiated") {
      order.payu.status = "Failed";
      order.payu.rawResponse = payload;
      await order.save();

      const cart = await Cart.findOne({ customerId: order.customerId });
      if (cart) await releaseCartReservations(cart);
    }

    return res.redirect(
      `${FRONTEND_FAILURE_URL}?orderId=${order ? order._id : ""}`,
    );
  } catch (error) {
    console.log("❌ PayU Failure Callback Error:", error.message);
    return res.redirect(`${FRONTEND_FAILURE_URL}?reason=server_error`);
  }
};

/**
 * GET MY ORDERS
 * GET /api/order/my
 * Protected — Customer only
 */
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customerId: req.customer._id })
      .populate("subOrders.vendorId", "businessName")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, total: orders.length, orders });
  } catch (error) {
    console.log("❌ Get My Orders Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET VENDOR ORDERS — only this vendor's subOrder slice of each order
 * GET /api/order/vendor/my
 * Protected — Vendor only
 */
const getVendorOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      "subOrders.vendorId": req.vendor._id,
      "payu.status": "Success",
    })
      .populate("customerId", "fname lname email mobile")
      .sort({ createdAt: -1 });

    const result = orders.map((order) => ({
      orderId: order._id,
      customer: order.customerId,
      deliveryAddress: order.deliveryAddress,
      createdAt: order.createdAt,
      subOrder: order.subOrders.find(
        (so) => so.vendorId.toString() === req.vendor._id.toString(),
      ),
    }));

    res
      .status(200)
      .json({ success: true, total: result.length, orders: result });
  } catch (error) {
    console.log("❌ Get Vendor Orders Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * UPDATE SUBORDER FULFILLMENT STATUS
 * PUT /api/order/vendor/:orderId/status
 * body: { status }  — Processing | Shipped | Delivered | Cancelled
 * Protected — Vendor only (own subOrder)
 */
const updateSubOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const subOrder = order.subOrders.find(
      (so) => so.vendorId.toString() === req.vendor._id.toString(),
    );

    if (!subOrder) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — you have no items in this order",
      });
    }

    subOrder.fulfillmentStatus = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Status updated",
      subOrder,
    });
  } catch (error) {
    console.log("❌ Update SubOrder Status Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  checkout,
  payuSuccess,
  payuFailure,
  getMyOrders,
  getVendorOrders,
  updateSubOrderStatus,
};
