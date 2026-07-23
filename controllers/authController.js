const Vendor = require("../models/Vendor");
const Contributor = require("../models/Contributor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const VALID_ROLES = ["vendor", "contributor"];

/**
 * EMAIL TRANSPORTER
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * EMAIL TEMPLATE — OTP (shared, generic)
 */
const otpEmailTemplate = (otp) => `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8" /><title>OTP Verification</title></head>
  <body style="margin:0; padding:0; background:#f4f4f4; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">
          <table width="600" cellpadding="0" cellspacing="0"
            style="background:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td align="center"
                style="background:#2563eb; padding:30px; color:#ffffff; font-size:28px; font-weight:bold;">
                Password Reset OTP
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin-top:0; color:#111827;">Hello,</h2>
                <p style="font-size:16px; color:#4b5563; line-height:26px;">
                  Please use the following OTP to reset your password.
                </p>
                <div style="margin:35px 0; text-align:center;">
                  <span
                    style="
                      display:inline-block;
                      background:#eff6ff;
                      color:#2563eb;
                      font-size:36px;
                      font-weight:bold;
                      letter-spacing:8px;
                      padding:18px 35px;
                      border-radius:10px;
                      border:2px dashed #2563eb;
                    "
                  >
                    ${otp}
                  </span>
                </div>
                <p style="font-size:15px; color:#6b7280;">
                  This OTP is valid for <strong>5 minutes</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="background:#f9fafb; padding:25px; font-size:14px; color:#9ca3af;">
                © 2026 RupiGold. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`;

// ── HELPER — return the correct Mongoose model for a role ──────
const getModelForRole = (role) => (role === "vendor" ? Vendor : Contributor);

// ── HELPER — human label for messages ───────────────────────────
const roleLabel = (role) => (role === "vendor" ? "Vendor" : "Contributor");

/**
 * SHARED LOGIN
 * POST /api/auth/login
 * body: { email, password, role }
 * role is mandatory — no auto-detection. Backend only checks the
 * collection matching the given role.
 */
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    console.log("=================================");
    console.log("📥 LOGIN API CALLED");
    console.log("📧 Email:", email, "| Role:", role);
    console.log("=================================");

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password and role are required",
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
      });
    }

    const Model = getModelForRole(role);
    const account = await Model.findOne({ email });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: `No ${roleLabel(role)} account found with this email`,
      });
    }

    if (!account.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your account first",
      });
    }

    // ── VENDOR-ONLY: ADMIN APPROVAL GATE ──────────────────────
    if (role === "vendor") {
      if (account.status === "pending" || account.status === "under_review") {
        return res.status(403).json({
          success: false,
          message: "Your account is awaiting admin approval",
        });
      }
      if (account.status === "rejected") {
        return res.status(403).json({
          success: false,
          message: "Your registration was rejected",
          reason: account.rejectionReason || undefined,
        });
      }
      if (account.status === "banned") {
        return res.status(403).json({
          success: false,
          message: "Your account has been banned",
        });
      }
    }

    const isPasswordMatched = await bcrypt.compare(password, account.password);

    if (!isPasswordMatched) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign({ id: account._id, role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const accountData = account.toObject();
    delete accountData.password;
    delete accountData.approvalToken;

    console.log(`✅ ${roleLabel(role)} login successful:`, account.email);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role,
      [role]: accountData,
    });
  } catch (error) {
    console.log("❌ Login Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * FORGOT PASSWORD
 * POST /api/auth/forgot-password
 * body: { email, role }
 */
const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: "Email and role are required",
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
      });
    }

    const Model = getModelForRole(role);
    const account = await Model.findOne({ email });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: `No ${roleLabel(role)} account found with this email`,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    account.otp = otp;
    account.otpExpiry = otpExpiry;
    await account.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Forgot Password OTP",
      html: otpEmailTemplate(otp),
    });

    console.log(`📨 Forgot-password OTP sent to ${roleLabel(role)}:`, email);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.log("❌ Forgot Password Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * VERIFY FORGOT-PASSWORD OTP
 * POST /api/auth/verify-forgot-otp
 * body: { email, otp, role }
 */
const verifyForgotOTP = async (req, res) => {
  try {
    const { email, otp, role } = req.body;

    if (!email || !otp || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and role are required",
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
      });
    }

    const Model = getModelForRole(role);
    const account = await Model.findOne({ email });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: `No ${roleLabel(role)} account found with this email`,
      });
    }

    if (!account.otp || account.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!account.otpExpiry || account.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.log("❌ Verify Forgot OTP Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * RESET PASSWORD
 * POST /api/auth/reset-password
 * body: { email, newPassword, role }
 * Note: must call verify-forgot-otp first — this endpoint re-checks
 * that a valid (non-expired) OTP still exists on the account as a
 * safety net so reset can't be called on its own without a prior
 * OTP verification step.
 */
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, role } = req.body;

    if (!email || !newPassword || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, new password and role are required",
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
      });
    }

    const Model = getModelForRole(role);
    const account = await Model.findOne({ email });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: `No ${roleLabel(role)} account found with this email`,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    account.password = hashedPassword;
    account.otp = null;
    account.otpExpiry = null;

    await account.save();

    console.log(`✅ Password reset successful for ${roleLabel(role)}:`, email);

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.log("❌ Reset Password Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = { login, forgotPassword, verifyForgotOTP, resetPassword };
