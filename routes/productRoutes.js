const express = require("express");
const router = express.Router();

const {
  createProduct,
  getMyProducts,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// PUBLIC
router.get("/all", getAllProducts);
router.get("/:id", getProductById);

// PROTECTED — Vendor only
router.post("/", protect, upload.single("productImage"), createProduct);
router.get("/my/products", protect, getMyProducts);
router.put("/:id", protect, upload.single("productImage"), updateProduct);
router.delete("/:id", protect, deleteProduct);

module.exports = router;
