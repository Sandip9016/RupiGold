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

    console.log("=================================");
    console.log("📥 CHECKOUT API CALLED");
    console.log("👤 Customer ID:", req.customer._id.toString());
    console.log("📦 Frontend sent body:", JSON.stringify(req.body));
    console.log("=================================");

    const cart = await Cart.findOne({ customerId: req.customer._id }).populate(
      "items.productId",
      "productName price vendorId",
    );

    if (!cart || cart.items.length === 0) {
      console.log("❌ Checkout rejected — cart is empty");
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    console.log(
      "🛒 Cart items at checkout:",
      JSON.stringify(
        cart.items.map((i) => ({
          productId: i.productId && i.productId._id,
          productName: i.productId && i.productId.productName,
          quantity: i.quantity,
          priceAtAdd: i.priceAtAdd,
        })),
      ),
    );

    // Guard: a product may have been deleted by its vendor after the
    // customer added it to cart — populate leaves productId as null
    // in that case. Fail clearly instead of crashing on null access.
    const missingProduct = cart.items.find((item) => !item.productId);
    if (missingProduct) {
      return res.status(400).json({
        success: false,
        message:
          "One or more items in your cart are no longer available. Please remove them and try again.",
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

    console.log(
      "📍 Resolved delivery address:",
      JSON.stringify(deliveryAddress),
    );

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

    console.log(
      `🧾 Split into ${subOrders.length} vendor sub-order(s), totalAmount:${totalAmount}`,
      JSON.stringify(subOrders),
    );

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

    const payuParams = {
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
    };

    console.log(
      "📤 Sending PayU params to frontend:",
      JSON.stringify(payuParams),
    );
    console.log("=================================");

    res.status(201).json({
      success: true,
      message: "Order created — submit these params to PayU to pay",
      orderId: order._id,
      payuAction: payu.PAYU_BASE_URL,
      payuParams,
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
    console.log("📥 PAYU SUCCESS CALLBACK — RAW PAYLOAD FROM PAYU:");
    console.log(JSON.stringify(payload, null, 2));
    console.log("=================================");

    const order = await Order.findOne({ "payu.txnId": payload.txnid });
    if (!order) {
      console.log("❌ No matching order found for txnid:", payload.txnid);
      return res.redirect(`${FRONTEND_FAILURE_URL}?reason=order_not_found`);
    }

    console.log(
      `🔎 Matched Order ${order._id} — expected amount:${order.totalAmount}, PayU sent amount:${payload.amount}`,
    );

    const hashValid = payu.verifyReverseHash(payload);
    console.log(
      "🔐 Reverse hash valid:",
      hashValid,
      "| PayU status field:",
      payload.status,
    );

    if (!hashValid || payload.status !== "success") {
      console.log(
        "❌ Hash mismatch or non-success status — marking order Failed",
      );
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
        console.log(
          `📦 Committing stock — product:${item.productId} decrementing quantity & reservedQuantity by ${item.quantity}`,
        );
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: -item.quantity, reservedQuantity: -item.quantity },
        });
      }
    }

    await Cart.findOneAndUpdate(
      { customerId: order.customerId },
      { items: [] },
    );

    console.log("✅ Order paid & stock committed:", order._id.toString());
    console.log("=================================");

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
    console.log("📥 PAYU FAILURE CALLBACK — RAW PAYLOAD FROM PAYU:");
    console.log(JSON.stringify(payload, null, 2));
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
    console.log("=================================");
    console.log("📥 GET MY ORDERS API CALLED");
    console.log("👤 Customer ID:", req.customer._id.toString());
    console.log("=================================");

    const orders = await Order.find({
      customerId: req.customer._id,
      "payu.status": "Success", // only paid orders — hide Initiated/Failed
    })
      .select("-payu.rawResponse -payu.txnId")
      .populate("subOrders.vendorId", "business_name")
      .populate(
        "subOrders.items.productId",
        "productName productImages category description purity weight price",
      )
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${orders.length} paid order(s)`);

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
    console.log("=================================");
    console.log("📥 GET VENDOR ORDERS API CALLED");
    console.log("👤 Vendor ID:", req.vendor._id.toString());
    console.log("=================================");

    const orders = await Order.find({
      "subOrders.vendorId": req.vendor._id,
      "payu.status": "Success",
    })
      .populate("customerId", "fname lname email mobile")
      .sort({ createdAt: -1 });

    console.log(
      `✅ Found ${orders.length} paid order(s) with this vendor's items`,
    );

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

    console.log("=================================");
    console.log("📥 UPDATE SUBORDER STATUS API CALLED");
    console.log("👤 Vendor ID:", req.vendor._id.toString());
    console.log(
      "📦 Order ID:",
      orderId,
      "| Frontend sent body:",
      JSON.stringify(req.body),
    );
    console.log("=================================");

    const validStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      console.log("❌ Rejected — invalid status value from frontend:", status);
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

    console.log(
      `✅ SubOrder status updated to "${status}" for order ${orderId}`,
    );

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

/**
 * CANCEL ORDER — customer-initiated, only before any subOrder ships.
 * Restores stock for every cancelled subOrder and flags the order
 * for a manual refund (see payu.refundStatus).
 *
 * PUT /api/order/:orderId/cancel
 * body: { reason }
 * Protected — Customer only (own order)
 */
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    console.log("=================================");
    console.log("📥 CANCEL ORDER API CALLED");
    console.log("👤 Customer ID:", req.customer._id.toString());
    console.log("📦 Order ID:", orderId, "| reason:", reason);
    console.log("=================================");

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.customerId.toString() !== req.customer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — not your order",
      });
    }

    if (order.payu.status !== "Success") {
      return res.status(400).json({
        success: false,
        message: "Only a paid order can be cancelled",
      });
    }

    // Any subOrder already Shipped/Delivered/Cancelled blocks a full
    // cancel — the customer can't unship a package. Partial vendor
    // fulfilment means partial cancel here, whole-order refund left
    // for admin to sort out manually.
    const nonCancellable = order.subOrders.filter(
      (so) => so.fulfillmentStatus !== "Processing",
    );
    if (nonCancellable.length === order.subOrders.length) {
      return res.status(400).json({
        success: false,
        message:
          "This order has already shipped and can no longer be cancelled",
      });
    }

    const cancelled = order.subOrders.filter(
      (so) => so.fulfillmentStatus === "Processing",
    );

    for (const subOrder of cancelled) {
      subOrder.fulfillmentStatus = "Cancelled";
      subOrder.cancelReason = reason || "Cancelled by customer";

      for (const item of subOrder.items) {
        console.log(
          `📦 Restoring stock — product:${item.productId} +${item.quantity}`,
        );
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: item.quantity },
        });
      }
    }

    order.payu.refundStatus = "Requested";
    await order.save();

    console.log(
      `✅ Cancelled ${cancelled.length}/${order.subOrders.length} subOrder(s) on order ${orderId} — refund marked Requested`,
    );

    res.status(200).json({
      success: true,
      message:
        nonCancellable.length > 0
          ? "Order partially cancelled — some items had already shipped"
          : "Order cancelled — refund is being processed",
      order,
    });
  } catch (error) {
    console.log("❌ Cancel Order Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * MARK ORDER REFUNDED — admin confirms money was actually sent back
 * outside the system (manual today, same pattern as payoutStatus).
 *
 * PUT /api/admin/order/:orderId/refund
 * Protected — Admin only
 */
const adminMarkRefunded = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log("=================================");
    console.log("📥 ADMIN MARK REFUNDED API CALLED");
    console.log("📦 Order ID:", orderId);
    console.log("=================================");

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (order.payu.refundStatus !== "Requested") {
      return res.status(400).json({
        success: false,
        message: `No refund pending — current refundStatus is "${order.payu.refundStatus}"`,
      });
    }

    order.payu.refundStatus = "Refunded";
    await order.save();

    console.log(`✅ Order ${orderId} marked Refunded`);

    res
      .status(200)
      .json({ success: true, message: "Order marked as refunded", order });
  } catch (error) {
    console.log("❌ Admin Mark Refunded Error:", error.message);
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
  cancelOrder,
  adminMarkRefunded,
};
