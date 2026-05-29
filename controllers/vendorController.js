const Vendor = require("../models/Vendor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

/**
 * EMAIL TRANSPORTER
 */

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  service: "gmail",

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

    await vendor.save();

    console.log("✅ Vendor verified successfully");

    const token = jwt.sign(
      {
        id: vendor._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    console.log("🔑 JWT Token generated");

    const vendorData = vendor.toObject();

    delete vendorData.password;

    res.status(200).json({
      success: true,
      message: "Vendor verified successfully",
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
 * LOGIN VENDOR
 */
const loginVendor = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("=================================");
    console.log("📥 LOGIN API CALLED");
    console.log("📧 Email:", email);
    console.log("=================================");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const vendor = await Vendor.findOne({ email });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (!vendor.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your account first",
      });
    }

    const isPasswordMatched = await bcrypt.compare(password, vendor.password);

    if (!isPasswordMatched) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: vendor._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    console.log("✅ Login successful");
    console.log("🔑 JWT token generated");

    const vendorData = vendor.toObject();

    delete vendorData.password;

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      vendor: vendorData,
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
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("=================================");
    console.log("📥 FORGOT PASSWORD API CALLED");
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log("🔢 Forgot Password OTP:", otp);

    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    vendor.otp = otp;
    vendor.otpExpiry = otpExpiry;

    await vendor.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Forgot Password OTP",
      html: otpEmailTemplate(otp),
    });

    console.log("📨 Forgot Password OTP Sent");

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
 * VERIFY FORGOT OTP
 */
const verifyForgotOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log("=================================");
    console.log("📥 VERIFY FORGOT OTP API CALLED");
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

    console.log("✅ Forgot Password OTP Verified");

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
 */
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    console.log("=================================");
    console.log("📥 RESET PASSWORD API CALLED");
    console.log("📧 Email:", email);
    console.log("=================================");

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });
    }

    const vendor = await Vendor.findOne({ email });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    console.log("🔒 New Password Hashed");

    vendor.password = hashedPassword;

    vendor.otp = null;
    vendor.otpExpiry = null;

    await vendor.save();

    console.log("✅ Password Reset Successful");

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

module.exports = {
  registerVendor,
  verifyOTP,
  resendOTP,
  loginVendor,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
  deleteVendor,
};
