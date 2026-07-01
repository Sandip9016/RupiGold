const jwt = require("jsonwebtoken");
const Vendor = require("../models/Vendor");
const Admin = require("../models/Admin");

// PROTECT — Vendor JWT
const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — Login first",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const vendor = await Vendor.findById(decoded.id).select("-password");

    if (!vendor) {
      return res.status(401).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // ── ADMIN APPROVAL GATE ─────────────────────────────────────
    if (vendor.approvalStatus === "Pending") {
      return res.status(403).json({
        success: false,
        message: "Your account is awaiting admin approval",
      });
    }

    if (vendor.approvalStatus === "Rejected") {
      return res.status(403).json({
        success: false,
        message: "Your registration was rejected",
        reason: vendor.rejectionReason || undefined,
      });
    }

    req.vendor = vendor;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// ADMIN PROTECT — Admin JWT only
const adminOnly = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — Admin login required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden — Admins only",
      });
    }

    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = { protect, adminOnly };
