const express = require("express");
const router = express.Router();

const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");

const { customerProtect } = require("../middleware/authMiddleware");

// ALL ROUTES — Protected, Customer only
router.post("/add", customerProtect, addToCart);
router.get("/", customerProtect, getCart);
router.put("/update", customerProtect, updateCartItem);
router.delete("/remove/:productId", customerProtect, removeFromCart);
router.delete("/clear", customerProtect, clearCart);

module.exports = router;
