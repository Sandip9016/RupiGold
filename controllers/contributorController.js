const Contributor = require("../models/Contributor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const fs = require("fs");

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
 * EMAIL TEMPLATE — OTP
 */
const otpEmailTemplate = (otp) => `
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
                style="background:#B8860B; padding:30px; color:#ffffff; font-size:28px; font-weight:bold;">
                Contributor Verification
              </td>
            </tr>

            <tr>
              <td style="padding:40px;">

                <h2 style="margin-top:0; color:#111827;">
                  Hello,
                </h2>

                <p style="font-size:16px; color:#4b5563; line-height:26px;">
                  Please use the following OTP to verify your Contributor account.
                </p>

                <div style="margin:35px 0; text-align:center;">
                  <span
                    style="
                      display:inline-block;
                      background:#fff8dc;
                      color:#B8860B;
                      font-size:36px;
                      font-weight:bold;
                      letter-spacing:8px;
                      padding:18px 35px;
                      border-radius:10px;
                      border:2px dashed #B8860B;
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
                © 2026 RupiGold Contributor Portal. All rights reserved.
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
 * POST /api/contributor/register
 * Fields: name, email, phone, profilePic (file), country, password
 * No admin approval — only OTP verification is required before login works.
 */
const registerContributor = async (req, res) => {
  try {
    const { name, email, phone, country, password } = req.body;

    console.log("=================================");
    console.log("📥 CONTRIBUTOR REGISTER API CALLED");
    console.log("👤 Name:", name);
    console.log("📧 Email:", email);
    console.log("📱 Phone:", phone);
    console.log("=================================");

    if (!name || !email || !phone || !country || !password) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "name, email, phone, country and password are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required",
      });
    }

    const existingEmail = await Contributor.findOne({ email });

    if (existingEmail) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const existingPhone = await Contributor.findOne({ phone });

    if (existingPhone) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Phone number already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    const contributor = await Contributor.create({
      name,
      email,
      phone,
      profilePic: req.file.path,
      country,
      password: hashedPassword,
      otp,
      otpExpiry,
    });

    console.log("✅ Contributor registered successfully");

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Contributor Registration OTP",
      html: otpEmailTemplate(otp),
    });

    console.log("📨 OTP sent to email successfully");

    res.status(201).json({
      success: true,
      message: "OTP sent to email successfully",
      contributorId: contributor._id,
    });
  } catch (error) {
    console.log("❌ Contributor Register Error:", error.message);

    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    if (req.body.email) {
      await Contributor.findOneAndDelete({ email: req.body.email });
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
 * POST /api/contributor/verify-otp
 * On success: account is fully active, no admin approval needed.
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const contributor = await Contributor.findOne({ email });

    if (!contributor) {
      return res.status(404).json({
        success: false,
        message: "Contributor not found",
      });
    }

    if (contributor.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (contributor.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    contributor.isVerified = true;
    contributor.otp = null;
    contributor.otpExpiry = null;

    await contributor.save();

    console.log("✅ Contributor verified successfully");

    const token = jwt.sign(
      { id: contributor._id, role: "contributor" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const contributorData = contributor.toObject();
    delete contributorData.password;

    res.status(200).json({
      success: true,
      message: "Contributor verified successfully. You can now log in.",
      token,
      contributor: contributorData,
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
 * POST /api/contributor/resend-otp
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const contributor = await Contributor.findOne({ email });

    if (!contributor) {
      return res.status(404).json({
        success: false,
        message: "Contributor not found",
      });
    }

    if (contributor.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Contributor already verified",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    contributor.otp = otp;
    contributor.otpExpiry = otpExpiry;

    await contributor.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Resend Contributor OTP",
      html: otpEmailTemplate(otp),
    });

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
 * DELETE CONTRIBUTOR BY EMAIL
 * GET /api/contributor/delete/:email
 */
const deleteContributor = async (req, res) => {
  try {
    const { email } = req.params;

    const contributor = await Contributor.findOne({ email });

    if (!contributor) {
      return res.status(404).json({
        success: false,
        message: "Contributor not found",
      });
    }

    await Contributor.findOneAndDelete({ email });

    res.status(200).json({
      success: true,
      message: "Contributor deleted successfully",
    });
  } catch (error) {
    console.log("❌ Delete Contributor Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET ALL CONTRIBUTORS
 * GET /api/contributor/all
 * Returns all contributors except password/otp fields
 */
const getAllContributors = async (req, res) => {
  try {
    const contributors = await Contributor.find().select(
      "-password -otp -otpExpiry",
    );

    res.status(200).json({
      success: true,
      total: contributors.length,
      contributors,
    });
  } catch (error) {
    console.log("❌ Get All Contributors Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  registerContributor,
  verifyOTP,
  resendOTP,
  deleteContributor,
  getAllContributors,
};
