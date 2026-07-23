const Product = require("../models/Product");

/**
 * CREATE PRODUCT
 * POST /api/product/
 * Protected — Vendor only
 */
const createProduct = async (req, res) => {
  try {
    const {
      productName,
      category,
      description,
      price,
      purity,
      weight,
      quantity,
    } = req.body;

    console.log("=================================");
    console.log("📥 CREATE PRODUCT API CALLED");
    console.log("🏷️ Product Name:", productName);
    console.log("👤 Vendor ID:", req.vendor._id);
    console.log("=================================");

    if (!productName || !category || !description || !price) {
      return res.status(400).json({
        success: false,
        message: "productName, category, description and price are required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product images are required (2 to 5 images)",
      });
    }

    if (req.files.length < 2 || req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: `Please upload between 2 and 5 images — you sent ${req.files.length}`,
      });
    }

    const qty = quantity !== undefined ? Number(quantity) : 0;

    if (Number.isNaN(qty) || qty < 0) {
      return res.status(400).json({
        success: false,
        message: "quantity must be a non-negative number",
      });
    }

    const productImages = req.files.map((file) => file.secure_url);

    const product = await Product.create({
      vendorId: req.vendor._id,
      productName,
      category,
      description,
      productImages,
      price,
      purity: purity || null,
      weight: weight || null,
      quantity: qty,
    });

    console.log("✅ Product created successfully:", product._id);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.log("❌ Create Product Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET MY PRODUCTS (logged-in vendor)
 * GET /api/product/my
 * Protected — Vendor only
 */
const getMyProducts = async (req, res) => {
  try {
    console.log("=================================");
    console.log("📥 GET MY PRODUCTS API CALLED");
    console.log("👤 Vendor ID:", req.vendor._id);
    console.log("=================================");

    const products = await Product.find({ vendorId: req.vendor._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      total: products.length,
      products,
    });
  } catch (error) {
    console.log("❌ Get My Products Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET ALL PRODUCTS (public)
 * GET /api/product/all
 */
const getAllProducts = async (req, res) => {
  try {
    console.log("=================================");
    console.log("📥 GET ALL PRODUCTS API CALLED");
    console.log("=================================");

    const products = await Product.find()
      .populate("vendorId", "business_name email city")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: products.length,
      products,
    });
  } catch (error) {
    console.log("❌ Get All Products Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET SINGLE PRODUCT BY ID (public)
 * GET /api/product/:id
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("=================================");
    console.log("📥 GET PRODUCT BY ID API CALLED");
    console.log("🆔 Product ID:", id);
    console.log("=================================");

    const product = await Product.findById(id).populate(
      "vendorId",
      "business_name email city",
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.log("❌ Get Product By ID Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * UPDATE PRODUCT
 * PUT /api/product/:id
 * Protected — Vendor only (own products)
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      productName,
      category,
      description,
      price,
      purity,
      weight,
      quantity,
    } = req.body;

    console.log("=================================");
    console.log("📥 UPDATE PRODUCT API CALLED");
    console.log("🆔 Product ID:", id);
    console.log("👤 Vendor ID:", req.vendor._id);
    console.log("=================================");

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Only owner vendor can update
    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — You can only update your own products",
      });
    }

    // Update fields if provided
    if (productName) product.productName = productName;
    if (category) product.category = category;
    if (description) product.description = description;
    if (price) product.price = price;
    if (purity !== undefined) product.purity = purity;
    if (weight !== undefined) product.weight = weight;
    if (quantity !== undefined) {
      const qty = Number(quantity);
      if (Number.isNaN(qty) || qty < 0) {
        return res.status(400).json({
          success: false,
          message: "quantity must be a non-negative number",
        });
      }
      if (qty < product.reservedQuantity) {
        return res.status(400).json({
          success: false,
          message: `quantity cannot be less than ${product.reservedQuantity} units currently reserved in customer carts`,
        });
      }
      product.quantity = qty;
    }

    // Update images if new ones uploaded — full replace, still 2 to 5
    if (req.files && req.files.length > 0) {
      if (req.files.length < 2 || req.files.length > 5) {
        return res.status(400).json({
          success: false,
          message: `Please upload between 2 and 5 images — you sent ${req.files.length}`,
        });
      }
      product.productImages = req.files.map((file) => file.secure_url);
    }

    await product.save();

    console.log("✅ Product updated successfully");

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.log("❌ Update Product Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * DELETE PRODUCT
 * DELETE /api/product/:id
 * Protected — Vendor only (own products)
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("=================================");
    console.log("📥 DELETE PRODUCT API CALLED");
    console.log("🆔 Product ID:", id);
    console.log("👤 Vendor ID:", req.vendor._id);
    console.log("=================================");

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Only owner vendor can delete
    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — You can only delete your own products",
      });
    }

    await Product.findByIdAndDelete(id);

    console.log("🗑️ Product deleted successfully");

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log("❌ Delete Product Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createProduct,
  getMyProducts,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
