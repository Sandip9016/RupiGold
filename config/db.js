const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    // AUTO-SEED ADMIN
    const Admin = require("../models/Admin");

    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await Admin.create({
        name: process.env.ADMIN_NAME || "Super Admin",
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
      });
      console.log("✅ Admin auto-created:", process.env.ADMIN_EMAIL);
    } else {
      console.log("ℹ️  Admin already exists:", process.env.ADMIN_EMAIL);
    }
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
