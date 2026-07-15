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

    if (!productId || !qtyToAdd || qtyToAdd < 1) {
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

    if (qtyToAdd > availableUnits(product)) {
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

    console.log("✅ Added to cart:", product.productName, "x", qtyToAdd);

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
      "productName productImage price quantity reservedQuantity",
    );

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

    if (
      !productId ||
      newQty === undefined ||
      Number.isNaN(newQty) ||
      newQty < 0
    ) {
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

    if (diff > 0 && diff > availableUnits(product)) {
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

    await Product.findByIdAndUpdate(productId, {
      $inc: { reservedQuantity: -item.quantity },
    });

    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    await cart.save();

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
    const cart = await Cart.findOne({ customerId: req.customer._id });
    if (!cart || cart.items.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "Cart already empty" });
    }

    await Promise.all(
      cart.items.map((item) =>
        Product.findByIdAndUpdate(item.productId, {
          $inc: { reservedQuantity: -item.quantity },
        }),
      ),
    );

    cart.items = [];
    await cart.save();

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
