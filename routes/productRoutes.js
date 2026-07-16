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

const { vendorProtect } = require("../middleware/authMiddleware");
const { productImageUpload } = require("../middleware/uploadMiddleware");

// PUBLIC
router.get("/all", getAllProducts);
router.get("/:id", getProductById);

// PROTECTED — Vendor only
router.post(
  "/",
  vendorProtect,
  productImageUpload.array("productImages", 5),
  createProduct,
);
router.get("/my/products", vendorProtect, getMyProducts);
router.put(
  "/:id",
  vendorProtect,
  productImageUpload.array("productImages", 5),
  updateProduct,
);
router.delete("/:id", vendorProtect, deleteProduct);

module.exports = router;
