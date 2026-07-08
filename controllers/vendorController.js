const Vendor = require("../models/Vendor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

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
 * VERIFY EMAIL SERVER
 */
transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Email Config Error:", error);
  } else {
    console.log("✅ Email Server Ready");
  }
});

/**
 * EMAIL TEMPLATE
 */
const otpEmailTemplate = (otp) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>OTP Verification</title>
  </head>

  <body style="margin:0; padding:0; background:#f4f4f4; font-family:Arial, sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 0;">

          <table width="600" cellpadding="0" cellspacing="0" 
            style="background:#ffffff; border-radius:12px; overflow:hidden;">

            <tr>
              <td 
                align="center" 
                style="background:#2563eb; padding:30px; color:#ffffff; font-size:28px; font-weight:bold;">
                Vendor Verification
              </td>
            </tr>

            <tr>
              <td style="padding:40px;">

                <h2 style="margin-top:0; color:#111827;">
                  Hello Vendor,
                </h2>

                <p style="font-size:16px; color:#4b5563; line-height:26px;">
                  Please use the following OTP.
                </p>

                <div 
                  style="
                    margin:35px 0;
                    text-align:center;
                  "
                >
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
                  This OTP is valid for
                  <strong>5 minutes</strong>.
                </p>

              </td>
            </tr>

            <tr>
              <td 
                align="center" 
                style="background:#f9fafb; padding:25px; font-size:14px; color:#9ca3af;">
                © 2026 Vendor Portal. All rights reserved.
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `;
};

/**
 * EMAIL TEMPLATE — NEW VENDOR NOTIFICATION (sent to ADMIN)
 */
const adminNewVendorTemplate = (vendor, acceptLink) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>New Vendor Approval Request</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#B8860B,#FFD700);padding:40px 40px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">🆕 New Vendor Awaiting Approval</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">RupiGold Admin Notification</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px;">

              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
                A vendor has verified their email (OTP confirmed) and is now waiting for your approval before they can access RupiGold.
              </p>

              <!-- VENDOR DETAILS CARD -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fafafa;border:1px solid #e8e0c8;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="background:#B8860B;padding:12px 20px;">
                    <p style="margin:0;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Vendor Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;font-size:14px;color:#333;line-height:1.9;">
                    <strong>Business Name:</strong> ${vendor.businessName}<br/>
                    <strong>Business Type:</strong> ${vendor.businessType}<br/>
                    <strong>Owner / Director:</strong> ${vendor.ownerDirectorName}<br/>
                    <strong>Email:</strong> ${vendor.email}<br/>
                    <strong>Mobile:</strong> ${vendor.mobileNumber}<br/>
                    <strong>Address:</strong> ${vendor.address}, ${vendor.city}, ${vendor.state}, ${vendor.country} - ${vendor.pincode}
                  </td>
                </tr>
              </table>

              <!-- ACCEPT BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="${acceptLink}" target="_blank"
                      style="display:inline-block;background:#1a7a4a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;">
                      ✅ Accept Vendor
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#888;line-height:1.7;text-align:center;">
                To reject this vendor (with a reason), please use the Admin Dashboard.
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

/**
 * REGISTER + SEND OTP
 */
const registerVendor = async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      ownerDirectorName,
      country,
      state,
      city,
      address,
      pincode,
      mobileNumber,
      email,
      password,
    } = req.body;

    console.log("=================================");
    console.log("📥 REGISTER API CALLED");
    console.log("🏢 Business Name:", businessName);
    console.log("📧 Email:", email);
    console.log("📱 Mobile:", mobileNumber);
    console.log("=================================");

    if (
      !businessName ||
      !businessType ||
      !ownerDirectorName ||
      !country ||
      !state ||
      !city ||
      !address ||
      !pincode ||
      !mobileNumber ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const existingEmail = await Vendor.findOne({ email });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const existingMobile = await Vendor.findOne({ mobileNumber });

    if (existingMobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("🔒 Password hashed successfully");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("🔢 OTP Generated:", otp);

    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const vendor = await Vendor.create({
      businessName,
      businessType,
      ownerDirectorName,
      country,
      state,
      city,
      address,
      pincode,
      mobileNumber,
      email,
      password: hashedPassword,
      otp,
      otpExpiry,
    });

    console.log("✅ Vendor registered successfully");

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Vendor Registration OTP",
      html: otpEmailTemplate(otp),
    });

    console.log("📨 OTP sent to email successfully");

    res.status(201).json({
      success: true,
      message: "OTP sent to email successfully",
      vendorId: vendor._id,
    });
  } catch (error) {
    console.log("❌ Register Error:", error.message);

    // DELETE USER IF EMAIL FAILED
    if (req.body.email) {
      await Vendor.findOneAndDelete({
        email: req.body.email,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * VERIFY OTP
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log("=================================");
    console.log("📥 VERIFY OTP API CALLED");
    console.log("📧 Email:", email);
    console.log("🔢 OTP:", otp);
    console.log("=================================");

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const vendor = await Vendor.findOne({ email });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (vendor.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (vendor.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    vendor.isVerified = true;
    vendor.otp = null;
    vendor.otpExpiry = null;

    // ── ADMIN APPROVAL WORKFLOW ─────────────────────────────────
    vendor.approvalStatus = "Pending";
    vendor.rejectionReason = null;
    vendor.approvalToken = crypto.randomBytes(32).toString("hex");

    await vendor.save();

    console.log("✅ Vendor verified successfully");

    const token = jwt.sign(
      {
        id: vendor._id,
        role: "vendor",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    console.log("🔑 JWT Token generated");

    // ── NOTIFY ADMIN — NEW VENDOR AWAITING APPROVAL ─────────────
    try {
      const backendUrl =
        process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;
      const acceptLink = `${backendUrl}/api/admin/vendor/approve/${vendor._id}/${vendor.approvalToken}`;

      await transporter.sendMail({
        from: `"RupiGold" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: "🆕 New Vendor Awaiting Approval — RupiGold",
        html: adminNewVendorTemplate(vendor, acceptLink),
      });
      console.log("📧 Admin notified about new vendor:", vendor.email);
    } catch (emailErr) {
      console.log(
        "⚠️ Admin notification email failed (non-blocking):",
        emailErr.message,
      );
    }

    const vendorData = vendor.toObject();

    delete vendorData.password;
    delete vendorData.approvalToken;

    res.status(200).json({
      success: true,
      message:
        "Vendor verified successfully. Your account is now awaiting admin approval.",
      token,
      vendor: vendorData,
    });
  } catch (error) {
    console.log("❌ Verify OTP Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * RESEND OTP
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("=================================");
    console.log("📥 RESEND OTP API CALLED");
    console.log("📧 Email:", email);
    console.log("=================================");

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const vendor = await Vendor.findOne({ email });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (vendor.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Vendor already verified",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("🔢 New OTP Generated:", otp);

    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    vendor.otp = otp;
    vendor.otpExpiry = otpExpiry;

    await vendor.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Resend Vendor OTP",
      html: otpEmailTemplate(otp),
    });

    console.log("📨 OTP resent successfully");

    res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.log("❌ Resend OTP Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * DELETE VENDOR BY EMAIL
 */
const deleteVendor = async (req, res) => {
  try {
    const { email } = req.params;

    console.log("=================================");
    console.log("📥 DELETE VENDOR API CALLED");
    console.log("📧 Email:", email);
    console.log("=================================");

    const vendor = await Vendor.findOne({ email });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    await Vendor.findOneAndDelete({ email });

    console.log("🗑️ Vendor Deleted Successfully");

    res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.log("❌ Delete Vendor Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET ALL VENDORS
 * GET /api/vendor/all
 * Returns all vendors except password/otp fields
 */
const getAllVendors = async (req, res) => {
  try {
    console.log("=================================");
    console.log("📥 GET ALL VENDORS API CALLED");
    console.log("=================================");

    const vendors = await Vendor.find().select("-password -otp -otpExpiry");

    res.status(200).json({
      success: true,
      total: vendors.length,
      vendors,
    });
  } catch (error) {
    console.log("❌ Get All Vendors Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  registerVendor,
  verifyOTP,
  resendOTP,
  deleteVendor,
  getAllVendors,
};
