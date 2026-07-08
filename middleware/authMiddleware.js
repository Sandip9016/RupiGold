const jwt = require("jsonwebtoken");
const Vendor = require("../models/Vendor");
const Contributor = require("../models/Contributor");
const Admin = require("../models/Admin");

// ── HELPER — extract bearer token ──────────────────────────────
const getToken = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

// ── VENDOR PROTECT — Vendor JWT only, product routes ────────────
const vendorProtect = async (req, res, next) => {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — Login first",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role && decoded.role !== "vendor") {
      return res.status(403).json({
        success: false,
        message: "Forbidden — Vendors only",
      });
    }

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

// ── CONTRIBUTOR PROTECT — Contributor JWT only, blog/post routes ─
// No admin approval gate — only OTP verification (isVerified) required.
const contributorProtect = async (req, res, next) => {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — Login first",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role && decoded.role !== "contributor") {
      return res.status(403).json({
        success: false,
        message: "Forbidden — Contributors only",
      });
    }

    const contributor = await Contributor.findById(decoded.id).select(
      "-password",
    );

    if (!contributor) {
      return res.status(401).json({
        success: false,
        message: "Contributor not found",
      });
    }

    if (!contributor.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your account first",
      });
    }

    req.contributor = contributor;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// ── ADMIN PROTECT — Admin JWT only ───────────────────────────────
const adminOnly = async (req, res, next) => {
  try {
    const token = getToken(req);

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

module.exports = { vendorProtect, contributorProtect, adminOnly };
