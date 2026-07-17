const express = require("express");
const router = express.Router();

const {
  checkout,
  payuSuccess,
  payuFailure,
  getMyOrders,
  getVendorOrders,
  updateSubOrderStatus,
  cancelOrder,
} = require("../controllers/orderController");

const {
  customerProtect,
  vendorProtect,
} = require("../middleware/authMiddleware");

// CUSTOMER — Protected
router.post("/checkout", customerProtect, checkout);
router.get("/my", customerProtect, getMyOrders);
router.put("/:orderId/cancel", customerProtect, cancelOrder);

// VENDOR — Protected
router.get("/vendor/my", vendorProtect, getVendorOrders);
router.put("/vendor/:orderId/status", vendorProtect, updateSubOrderStatus);

// PAYU CALLBACKS — Public (PayU posts here directly, no JWT available).
// Hash is verified server-side inside the controller — do not remove.
router.post("/payu/success", payuSuccess);
router.post("/payu/failure", payuFailure);

module.exports = router;
