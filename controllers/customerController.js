const Customer = require("../models/Customer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

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
 * EMAIL TEMPLATE — REGISTRATION / RESEND OTP
 */
const otpEmailTemplate = (otp, fname) => `
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
                RupiGold — Account Verification
              </td>
            </tr>

            <tr>
              <td style="padding:40px;">

                <h2 style="margin-top:0; color:#111827;">
                  Hello ${fname || ""},
                </h2>

                <p style="font-size:16px; color:#4b5563; line-height:26px;">
                  Thank you for registering with RupiGold. Please use the
                  following OTP to verify your account.
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
                  <strong>5 minutes</strong>. If you did not request this,
                  please ignore this email.
                </p>

              </td>
            </tr>

            <tr>
              <td
                align="center"
                style="background:#f9fafb; padding:25px; font-size:14px; color:#9ca3af;">
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

/**
 * EMAIL TEMPLATE — FORGOT PASSWORD OTP
 */
const forgotPasswordEmailTemplate = (otp, fname) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Password Reset OTP</title>
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
                RupiGold — Password Reset
              </td>
            </tr>

            <tr>
              <td style="padding:40px;">

                <h2 style="margin-top:0; color:#111827;">
                  Hello ${fname || ""},
                </h2>

                <p style="font-size:16px; color:#4b5563; line-height:26px;">
                  We received a request to reset your RupiGold account
                  password. Use the OTP below to proceed.
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
                  This OTP is valid for
                  <strong>5 minutes</strong>. If you did not request a
                  password reset, please ignore this email — your password
                  will remain unchanged.
                </p>

              </td>
            </tr>

            <tr>
              <td
                align="center"
                style="background:#f9fafb; padding:25px; font-size:14px; color:#9ca3af;">
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

// ── HELPER — generate 6-digit OTP + 5 min expiry ────────────────
const generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
  return { otp, otpExpiry };
};

// ── HELPER — issue JWT for a customer ────────────────────────────
const issueToken = (customerId) =>
  jwt.sign({ id: customerId, role: "customer" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

// ── HELPER — strip sensitive fields before sending customer back ─
const sanitize = (customer) => {
  const data = customer.toObject();
  delete data.password;
  delete data.otp;
  delete data.otpExpiry;
  return data;
};

/**
 * REGISTER + SEND OTP
 * POST /api/customer/register
 * body: { fname, lname, mobile, email, password }
 */
const registerCustomer = async (req, res) => {
  try {
    const { fname, lname, mobile, email, password } = req.body;

    console.log("=================================");
    console.log("📥 CUSTOMER REGISTER API CALLED");
    console.log("👤 Name:", fname, lname);
    console.log("📧 Email:", email);
    console.log("📱 Mobile:", mobile);
    console.log("=================================");

    if (!fname || !lname || !mobile || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "fname, lname, mobile, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const existingEmail = await Customer.findOne({
      email: email.toLowerCase(),
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const existingMobile = await Customer.findOne({ mobile });

    if (existingMobile) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { otp, otpExpiry } = generateOTP();

    const customer = await Customer.create({
      fname,
      lname,
      mobile,
      email,
      password: hashedPassword,
      otp,
      otpExpiry,
    });

    console.log("✅ Customer registered successfully");

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "RupiGold — Verify Your Account",
        html: otpEmailTemplate(otp, fname),
      });
      console.log("📨 OTP sent to email successfully");
    } catch (mailError) {
      console.log("❌ OTP Mail Send Error:", mailError.message);
      await Customer.findByIdAndDelete(customer._id);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again.",
      });
    }

    res.status(201).json({
      success: true,
      message: "OTP sent to email successfully",
      customerId: customer._id,
    });
  } catch (error) {
    console.log("❌ Customer Register Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * VERIFY OTP (registration)
 * POST /api/customer/verify-otp
 * body: { email, otp }
 * On success: account activated + JWT issued (auto-login).
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

    const customer = await Customer.findOne({ email: email.toLowerCase() });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (customer.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Customer already verified",
      });
    }

    if (!customer.otp || customer.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!customer.otpExpiry || customer.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    customer.isVerified = true;
    customer.otp = null;
    customer.otpExpiry = null;

    await customer.save();

    console.log("✅ Customer verified successfully:", customer.email);

    const token = issueToken(customer._id);

    res.status(200).json({
      success: true,
      message: "Customer verified successfully",
      token,
      customer: sanitize(customer),
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
 * POST /api/customer/resend-otp
 * body: { email } OR { mobile }
 */
const resendOTP = async (req, res) => {
  try {
    const { email, mobile } = req.body;

    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: "Email or mobile is required",
      });
    }

    const query = email ? { email: email.toLowerCase() } : { mobile };
    const customer = await Customer.findOne(query);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (customer.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Customer already verified",
      });
    }

    const { otp, otpExpiry } = generateOTP();

    customer.otp = otp;
    customer.otpExpiry = otpExpiry;

    await customer.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: customer.email,
      subject: "RupiGold — Resend OTP",
      html: otpEmailTemplate(otp, customer.fname),
    });

    console.log("📨 OTP resent successfully:", customer.email);

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
 * LOGIN
 * POST /api/customer/login
 * body: { identifier, password }
 * identifier = email OR mobile
 */
const loginCustomer = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Email/Mobile and password are required",
      });
    }

    const customer = await Customer.findOne({
      $or: [{ email: identifier.toLowerCase() }, { mobile: identifier }],
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "No customer account found with this email/mobile",
      });
    }

    if (!customer.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your account first",
      });
    }

    const isPasswordMatched = await bcrypt.compare(password, customer.password);

    if (!isPasswordMatched) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = issueToken(customer._id);

    console.log("✅ Customer login successful:", customer.email);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: "customer",
      customer: sanitize(customer),
    });
  } catch (error) {
    console.log("❌ Customer Login Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * FORGOT PASSWORD
 * POST /api/customer/forgot-password
 * body: { email }
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const customer = await Customer.findOne({ email: email.toLowerCase() });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "No customer account found with this email",
      });
    }

    const { otp, otpExpiry } = generateOTP();

    customer.otp = otp;
    customer.otpExpiry = otpExpiry;

    await customer.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: customer.email,
      subject: "RupiGold — Forgot Password OTP",
      html: forgotPasswordEmailTemplate(otp, customer.fname),
    });

    console.log("📨 Forgot-password OTP sent to:", customer.email);

    res.status(200).json({
      success: true,
      message: "OTP sent to email successfully",
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
 * POST /api/customer/verify-forgot-otp
 * body: { email, otp }
 */
const verifyForgotOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const customer = await Customer.findOne({ email: email.toLowerCase() });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (!customer.otp || customer.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!customer.otpExpiry || customer.otpExpiry < new Date()) {
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
 * POST /api/customer/reset-password
 * body: { email, otp, newPassword }
 * Re-validates the OTP here too, so this endpoint cannot be called
 * on its own without a valid, non-expired OTP on the account.
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const customer = await Customer.findOne({ email: email.toLowerCase() });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (!customer.otp || customer.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!customer.otpExpiry || customer.otpExpiry < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    customer.password = hashedPassword;
    customer.otp = null;
    customer.otpExpiry = null;

    await customer.save();

    console.log("✅ Password reset successful for:", customer.email);

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
 * GET PROFILE
 * GET /api/customer/profile
 * Protected — Customer only
 */
const getProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    res.status(200).json({ success: true, customer: sanitize(customer) });
  } catch (error) {
    console.log("❌ Get Profile Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * UPDATE PROFILE
 * PUT /api/customer/profile
 * body: { fname, lname, mobile, email }
 * Protected — Customer only
 * All fields optional — only the ones sent are updated.
 */
const updateProfile = async (req, res) => {
  try {
    const { fname, lname, mobile, email } = req.body;

    const customer = await Customer.findById(req.customer._id);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    if (email && email.toLowerCase() !== customer.email) {
      const existingEmail = await Customer.findOne({
        email: email.toLowerCase(),
        _id: { $ne: customer._id },
      });
      if (existingEmail) {
        return res
          .status(400)
          .json({ success: false, message: "Email already exists" });
      }
      customer.email = email.toLowerCase();
    }

    if (mobile && mobile !== customer.mobile) {
      const existingMobile = await Customer.findOne({
        mobile,
        _id: { $ne: customer._id },
      });
      if (existingMobile) {
        return res
          .status(400)
          .json({ success: false, message: "Mobile number already exists" });
      }
      customer.mobile = mobile;
    }

    if (fname) customer.fname = fname;
    if (lname) customer.lname = lname;

    await customer.save();

    console.log("✅ Profile updated for customer:", customer.email);

    res.status(200).json({
      success: true,
      message: "Profile updated",
      customer: sanitize(customer),
    });
  } catch (error) {
    console.log("❌ Update Profile Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * ADD ADDRESS
 * POST /api/customer/address
 * body: { label, line1, line2, city, state, pincode, isDefault }
 * Protected — Customer only
 * A customer may save at most 2 addresses (1 primary + 1 secondary).
 */
const addAddress = async (req, res) => {
  try {
    const { label, line1, line2, city, state, pincode, isDefault } = req.body;

    if (!line1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "line1, city, state and pincode are required",
      });
    }

    const customer = await Customer.findById(req.customer._id);

    if (customer.addresses.length >= 2) {
      return res.status(400).json({
        success: false,
        message:
          "You can only save up to 2 addresses. Please update or delete an existing one.",
      });
    }

    if (isDefault) {
      customer.addresses.forEach((a) => (a.isDefault = false));
    }

    customer.addresses.push({
      label: label || "Home",
      line1,
      line2: line2 || "",
      city,
      state,
      pincode,
      isDefault: isDefault || customer.addresses.length === 0, // first address defaults true (primary)
    });

    await customer.save();

    console.log("✅ Address added for customer:", customer.email);

    res.status(201).json({
      success: true,
      message: "Address added",
      addresses: customer.addresses,
    });
  } catch (error) {
    console.log("❌ Add Address Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * UPDATE ADDRESS
 * PUT /api/customer/address/:addressId
 * body: { label, line1, line2, city, state, pincode, isDefault }
 * Protected — Customer only
 * All fields optional — only the ones sent are updated.
 */
const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, line1, line2, city, state, pincode, isDefault } = req.body;

    const customer = await Customer.findById(req.customer._id);
    const address = customer.addresses.id(addressId);

    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    if (label !== undefined) address.label = label;
    if (line1 !== undefined) address.line1 = line1;
    if (line2 !== undefined) address.line2 = line2;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (pincode !== undefined) address.pincode = pincode;

    if (isDefault) {
      customer.addresses.forEach((a) => (a.isDefault = false));
      address.isDefault = true;
    }

    await customer.save();

    console.log("✅ Address updated for customer:", customer.email);

    res.status(200).json({
      success: true,
      message: "Address updated",
      addresses: customer.addresses,
    });
  } catch (error) {
    console.log("❌ Update Address Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * GET ADDRESSES
 * GET /api/customer/address
 * Protected — Customer only
 */
const getAddresses = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id).select(
      "addresses",
    );
    res.status(200).json({ success: true, addresses: customer.addresses });
  } catch (error) {
    console.log("❌ Get Addresses Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * DELETE ADDRESS
 * DELETE /api/customer/address/:addressId
 * Protected — Customer only
 */
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const customer = await Customer.findById(req.customer._id);

    const address = customer.addresses.id(addressId);
    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    const wasDefault = address.isDefault;
    address.deleteOne();

    if (wasDefault && customer.addresses.length > 0) {
      customer.addresses[0].isDefault = true;
    }

    await customer.save();

    res.status(200).json({
      success: true,
      message: "Address deleted",
      addresses: customer.addresses,
    });
  } catch (error) {
    console.log("❌ Delete Address Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

/**
 * SET DEFAULT ADDRESS
 * PUT /api/customer/address/:addressId/default
 * Protected — Customer only
 */
const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const customer = await Customer.findById(req.customer._id);

    const address = customer.addresses.id(addressId);
    if (!address) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    customer.addresses.forEach((a) => (a.isDefault = false));
    address.isDefault = true;

    await customer.save();

    res.status(200).json({
      success: true,
      message: "Default address updated",
      addresses: customer.addresses,
    });
  } catch (error) {
    console.log("❌ Set Default Address Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  registerCustomer,
  verifyOTP,
  resendOTP,
  loginCustomer,
  forgotPassword,
  verifyForgotOTP,
  resetPassword,
  getProfile,
  updateProfile,
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
