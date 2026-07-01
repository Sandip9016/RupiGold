const express = require("express");
const router = express.Router();

const {
  loginAdmin,
  getPendingVendors,
  approveVendorViaLink,
  approveVendorDashboard,
  rejectVendorDashboard,
} = require("../controllers/adminController");

const { adminOnly } = require("../middleware/authMiddleware");

// POST /api/admin/login
router.post("/login", loginAdmin);

// ── VENDOR APPROVAL — ONE-CLICK LINK FROM EMAIL (public, token-secured) ──
router.get("/vendor/approve/:vendorId/:token", approveVendorViaLink);

// ── VENDOR APPROVAL — ADMIN DASHBOARD (JWT protected) ──────────
router.get("/vendors/pending", adminOnly, getPendingVendors);
router.patch("/vendor/:id/approve", adminOnly, approveVendorDashboard);
router.patch("/vendor/:id/reject", adminOnly, rejectVendorDashboard);

module.exports = router;
