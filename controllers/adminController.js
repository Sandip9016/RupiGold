const Admin = require("../models/Admin");
const Vendor = require("../models/Vendor");
const Contributor = require("../models/Contributor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// ─── EMAIL TRANSPORTER ────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── EMAIL TEMPLATE: VENDOR APPROVED ──────────────────────────
const vendorApprovedTemplate = (vendorName, businessName) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>Vendor Approved</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a7a4a,#2ecc71);padding:40px 40px 30px;text-align:center;">
              <div style="font-size:40px;margin-bottom:12px;">✅</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Account Approved!</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">You can now use RupiGold</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px;">

              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1a1a2e;">Congratulations, ${vendorName}! 🎉</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
                Great news! Your vendor account for <strong>${businessName}</strong> has been <strong style="color:#1a7a4a;">approved</strong> by our admin team. You now have full access to RupiGold — you can submit posts and list products right away.
              </p>

              <p style="margin:0;font-size:14px;color:#888;line-height:1.7;">
                Log in to your account to get started. We're excited to have you as part of the RupiGold community! 💛
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#1a1a2e;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;color:#FFD700;font-size:14px;font-weight:600;">RupiGold — India's Gold & Finance Platform</p>
              <p style="margin:0;color:rgba(255,255,255,0.45);font-size:12px;">This is an automated email. Please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;

// ─── EMAIL TEMPLATE: VENDOR REJECTED ──────────────────────────
const vendorRejectedTemplate = (vendorName, businessName, reason) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>Vendor Registration Rejected</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#c0392b,#e74c3c);padding:40px 40px 30px;text-align:center;">
              <div style="font-size:40px;margin-bottom:12px;">❌</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Registration Not Approved</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your vendor account could not be approved</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px;">

              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1a1a2e;">Hello, ${vendorName}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
                After careful review, our admin team has decided <strong style="color:#c0392b;">not to approve</strong> your vendor account for <strong>${businessName}</strong> at this time.
              </p>

              <!-- REASON CARD -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fff5f5;border:1px solid #f5c6c6;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="background:#c0392b;padding:12px 20px;">
                    <p style="margin:0;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Reason for Rejection</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0;font-size:15px;color:#1a1a2e;line-height:1.7;">${reason}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#888;line-height:1.7;">
                If you believe this was a mistake or would like to reach out for clarification, please contact our support team. Thank you for your interest in RupiGold. 🙏
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#1a1a2e;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;color:#FFD700;font-size:14px;font-weight:600;">RupiGold — India's Gold & Finance Platform</p>
              <p style="margin:0;color:rgba(255,255,255,0.45);font-size:12px;">This is an automated email. Please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;

// ─── SIMPLE HTML PAGE (shown when admin clicks Accept link in email) ──
const simpleResultPage = (title, message, success) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">
  <div style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:48px;text-align:center;max-width:420px;">
    <div style="font-size:48px;margin-bottom:16px;">${success ? "✅" : "⚠️"}</div>
    <h2 style="margin:0 0 12px;color:#1a1a2e;">${title}</h2>
    <p style="margin:0;color:#555;font-size:15px;line-height:1.6;">${message}</p>
  </div>
</body>
</html>
`;

// ADMIN LOGIN
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("=================================");
    console.log("🔐 ADMIN LOGIN API CALLED");
    console.log("=================================");

    // 1. VALIDATE INPUT
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    // 2. FIND ADMIN
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 3. CHECK PASSWORD
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 4. GENERATE JWT
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    console.log("✅ Admin logged in:", admin.email);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("❌ Admin Login Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ─── GET PENDING VENDORS — ADMIN DASHBOARD ────────────────────
const getPendingVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ status: "pending" })
      .select("-password -otp -otpExpiry -approvalToken")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: vendors.length,
      vendors,
    });
  } catch (error) {
    console.log("❌ Get Pending Vendors Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ─── APPROVE VENDOR VIA ONE-CLICK EMAIL LINK (public, token-secured) ──
const approveVendorViaLink = async (req, res) => {
  try {
    const { vendorId, token } = req.params;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res
        .status(404)
        .send(
          simpleResultPage(
            "Vendor Not Found",
            "This vendor no longer exists.",
            false,
          ),
        );
    }

    if (vendor.status !== "pending") {
      return res
        .status(400)
        .send(
          simpleResultPage(
            "Already Processed",
            `This vendor has already been marked as "${vendor.status}".`,
            false,
          ),
        );
    }

    if (!vendor.approvalToken || vendor.approvalToken !== token) {
      return res
        .status(401)
        .send(
          simpleResultPage(
            "Invalid Link",
            "This approval link is invalid or has expired.",
            false,
          ),
        );
    }

    vendor.status = "approved";
    vendor.rejectionReason = null;
    vendor.approvalToken = null;
    vendor.approved_at = new Date();
    await vendor.save();

    console.log("✅ Vendor approved via email link:", vendor.email);

    try {
      await transporter.sendMail({
        from: `"RupiGold" <${process.env.EMAIL_USER}>`,
        to: vendor.email,
        subject: "✅ Your Vendor Account is Approved — RupiGold",
        html: vendorApprovedTemplate(vendor.name, vendor.business_name),
      });
      console.log("📧 Approval email sent to:", vendor.email);
    } catch (emailErr) {
      console.log("⚠️ Email send failed (non-blocking):", emailErr.message);
    }

    res
      .status(200)
      .send(
        simpleResultPage(
          "Vendor Approved",
          `${vendor.business_name} has been approved and notified by email.`,
          true,
        ),
      );
  } catch (error) {
    console.log("❌ Approve Vendor (Link) Error:", error.message);
    res
      .status(500)
      .send(
        simpleResultPage(
          "Server Error",
          "Something went wrong. Please try again from the dashboard.",
          false,
        ),
      );
  }
};

// ─── APPROVE VENDOR — ADMIN DASHBOARD ─────────────────────────
const approveVendorDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    if (vendor.status === "approved") {
      return res
        .status(400)
        .json({ success: false, message: "Vendor is already approved" });
    }

    vendor.status = "approved";
    vendor.rejectionReason = null;
    vendor.approvalToken = null;
    vendor.approved_at = new Date();
    await vendor.save();

    console.log("✅ Vendor approved via dashboard:", vendor.email);

    try {
      await transporter.sendMail({
        from: `"RupiGold" <${process.env.EMAIL_USER}>`,
        to: vendor.email,
        subject: "✅ Your Vendor Account is Approved — RupiGold",
        html: vendorApprovedTemplate(vendor.name, vendor.business_name),
      });
      console.log("📧 Approval email sent to:", vendor.email);
    } catch (emailErr) {
      console.log("⚠️ Email send failed (non-blocking):", emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Vendor approved successfully",
      vendor,
    });
  } catch (error) {
    console.log("❌ Approve Vendor (Dashboard) Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── REJECT VENDOR — ADMIN DASHBOARD ONLY (reason required) ──
const rejectVendorDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    if (vendor.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "This vendor is already approved and cannot be rejected",
      });
    }

    vendor.status = "rejected";
    vendor.rejectionReason = reason.trim();
    vendor.approvalToken = null;
    await vendor.save();

    console.log("🚫 Vendor rejected via dashboard:", vendor.email);

    try {
      await transporter.sendMail({
        from: `"RupiGold" <${process.env.EMAIL_USER}>`,
        to: vendor.email,
        subject: "❌ Your Vendor Registration Was Not Approved — RupiGold",
        html: vendorRejectedTemplate(
          vendor.name,
          vendor.business_name,
          vendor.rejectionReason,
        ),
      });
      console.log("📧 Rejection email sent to:", vendor.email);
    } catch (emailErr) {
      console.log("⚠️ Email send failed (non-blocking):", emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Vendor rejected successfully",
      vendor,
    });
  } catch (error) {
    console.log("❌ Reject Vendor (Dashboard) Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── GET ALL CONTRIBUTORS — ADMIN VISIBILITY ──────────────────
// Contributors have no approval workflow (OTP-only), so this is a
// read-only monitoring list for the admin dashboard.
const getAllContributorsAdmin = async (req, res) => {
  try {
    const contributors = await Contributor.find()
      .select("-password -otp -otpExpiry")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: contributors.length,
      contributors,
    });
  } catch (error) {
    console.log("❌ Get All Contributors (Admin) Error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

module.exports = {
  loginAdmin,
  getPendingVendors,
  approveVendorViaLink,
  approveVendorDashboard,
  rejectVendorDashboard,
  getAllContributorsAdmin,
};
