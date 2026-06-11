const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

module.exports = { loginAdmin };
