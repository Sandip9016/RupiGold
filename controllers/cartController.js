const Cart = require("../models/Cart");
const Product = require("../models/Product");

// ── HELPER — available-to-buy units on a product ────────────────
const availableUnits = (product) => product.quantity - product.reservedQuantity;

/**
 * ADD TO CART
 * POST /api/cart/add
 * body: { productId, quantity }
 * Protected — Customer only
 */
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const qtyToAdd = Number(quantity);

    console.log("=================================");
    console.log("📥 ADD TO CART API CALLED");
    console.log("👤 Customer ID:", req.customer._id.toString());
    console.log("📦 Frontend sent body:", JSON.stringify(req.body));
    console.log("=================================");

    if (!productId || !qtyToAdd || qtyToAdd < 1) {
      console.log(
        "❌ Rejected — invalid productId/quantity from frontend:",
        req.body,
      );
      return res.status(400).json({
        success: false,
        message: "productId and a positive quantity are required",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    let cart = await Cart.findOne({ customerId: req.customer._id });
    if (!cart) {
      cart = await Cart.create({ customerId: req.customer._id, items: [] });
    }

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId,
    );

    // How many more units this action actually needs to reserve
    // (existing cart line already holds a reservation).
    const alreadyInCart = existingItem ? existingItem.quantity : 0;
    const totalWanted = alreadyInCart + qtyToAdd;

    console.log(
      `🔎 Product "${product.productName}" — current quantity:${product.quantity} reserved:${product.reservedQuantity} available:${availableUnits(product)} | already in this cart:${alreadyInCart} | requesting to add:${qtyToAdd}`,
    );

    if (qtyToAdd > availableUnits(product)) {
      console.log("❌ Rejected — not enough stock available");
      return res.status(400).json({
        success: false,
        message: `Only ${availableUnits(product)} unit(s) available for this product`,
      });
    }

    if (existingItem) {
      existingItem.quantity = totalWanted;
      existingItem.priceAtAdd = product.price; // refresh to current price
    } else {
      cart.items.push({
        productId: product._id,
        vendorId: product.vendorId,
        quantity: qtyToAdd,
        priceAtAdd: product.price,
      });
    }

    product.reservedQuantity += qtyToAdd;

    await product.save();
    await cart.save();

    console.log(
      `✅ Added to cart: ${product.productName} — line item quantity now:${existingItem ? existingItem.quantity : qtyToAdd} | product.reservedQuantity now:${product.reservedQuantity}`,
    );

    res.status(200).json({
      success: true,
      message: "Added to cart",
      cart,
    });
  } catch (error) {
    console.log("❌ Add To Cart Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET CART
 * GET /api/cart
 * Protected — Customer only
 */
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      customerId: req.customer._id,
    }).populate(
      "items.productId",
      "productName productImages price quantity reservedQuantity",
    );

    console.log("=================================");
    console.log("📥 GET CART API CALLED");
    console.log("👤 Customer ID:", req.customer._id.toString());
    console.log("🛒 Items in cart:", cart ? cart.items.length : 0);
    console.log("=================================");

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        cart: { items: [] },
        totalAmount: 0,
      });
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.priceAtAdd * item.quantity,
      0,
    );

    res.status(200).json({
      success: true,
      cart,
      totalAmount,
    });
  } catch (error) {
    console.log("❌ Get Cart Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * UPDATE CART ITEM QUANTITY
 * PUT /api/cart/update
 * body: { productId, quantity }  — quantity 0 removes the item
 * Protected — Customer only
 */
const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const newQty = Number(quantity);

    console.log("=================================");
    console.log("📥 UPDATE CART ITEM API CALLED");
    console.log("👤 Customer ID:", req.customer._id.toString());
    console.log("📦 Frontend sent body:", JSON.stringify(req.body));
    console.log("=================================");

    if (
      !productId ||
      newQty === undefined ||
      Number.isNaN(newQty) ||
      newQty < 0
    ) {
      console.log(
        "❌ Rejected — invalid productId/quantity from frontend:",
        req.body,
      );
      return res.status(400).json({
        success: false,
        message: "productId and a non-negative quantity are required",
      });
    }

    const cart = await Cart.findOne({ customerId: req.customer._id });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const diff = newQty - item.quantity; // positive = need more reservation

    console.log(
      `🔎 Cart line for "${product.productName}" — was:${item.quantity} → requested:${newQty} (diff:${diff}) | product.reservedQuantity before:${product.reservedQuantity} available before:${availableUnits(product)}`,
    );

    if (diff > 0 && diff > availableUnits(product)) {
      console.log("❌ Rejected — not enough additional stock available");
      return res.status(400).json({
        success: false,
        message: `Only ${availableUnits(product)} more unit(s) available`,
      });
    }

    product.reservedQuantity += diff;
    await product.save();

    if (newQty === 0) {
      cart.items = cart.items.filter(
        (i) => i.productId.toString() !== productId,
      );
    } else {
      item.quantity = newQty;
    }

    await cart.save();

    console.log(
      `✅ Cart updated — "${product.productName}" line item now:${newQty} | product.reservedQuantity now:${product.reservedQuantity}`,
    );

    res.status(200).json({
      success: true,
      message: "Cart updated",
      cart,
    });
  } catch (error) {
    console.log("❌ Update Cart Item Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * REMOVE FROM CART
 * DELETE /api/cart/remove/:productId
 * Protected — Customer only
 */
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    console.log("=================================");
    console.log("📥 REMOVE FROM CART API CALLED");
    console.log("👤 Customer ID:", req.customer._id.toString());
    console.log("📦 Product ID param:", productId);
    console.log("=================================");

    const cart = await Cart.findOne({ customerId: req.customer._id });
    if (!cart) {
      console.log("❌ Cart not found for this customer");
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (!item) {
      console.log("❌ Product not present in cart");
      return res.status(404).json({
        success: false,
        message: "Product not in cart",
      });
    }

    console.log(
      `🔎 Releasing reserved quantity:${item.quantity} for productId:${productId}`,
    );

    await Product.findByIdAndUpdate(productId, {
      $inc: { reservedQuantity: -item.quantity },
    });

    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    await cart.save();

    console.log("✅ Removed from cart, remaining items:", cart.items.length);

    res.status(200).json({
      success: true,
      message: "Removed from cart",
      cart,
    });
  } catch (error) {
    console.log("❌ Remove From Cart Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * CLEAR CART
 * DELETE /api/cart/clear
 * Protected — Customer only
 */
const clearCart = async (req, res) => {
  try {
    console.log("=================================");
    console.log("📥 CLEAR CART API CALLED");
    console.log("👤 Customer ID:", req.customer._id.toString());
    console.log("=================================");

    const cart = await Cart.findOne({ customerId: req.customer._id });
    if (!cart || cart.items.length === 0) {
      console.log("ℹ️ Cart already empty");
      return res
        .status(200)
        .json({ success: true, message: "Cart already empty" });
    }

    console.log(
      `🔎 Releasing reservations for ${cart.items.length} line item(s)`,
    );

    await Promise.all(
      cart.items.map((item) =>
        Product.findByIdAndUpdate(item.productId, {
          $inc: { reservedQuantity: -item.quantity },
        }),
      ),
    );

    cart.items = [];
    await cart.save();

    console.log("✅ Cart cleared");

    res.status(200).json({ success: true, message: "Cart cleared" });
  } catch (error) {
    console.log("❌ Clear Cart Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
