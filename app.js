const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

require("dotenv").config();

// Without these, an unhandled async error ANYWHERE in the app (not just
// our new routes) kills the whole process with no clear log — exactly
// the "server crashed" symptom. Log it loudly so the real cause is visible.
process.on("unhandledRejection", (reason) => {
  console.error("💥 UNHANDLED PROMISE REJECTION:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION:", err);
});

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;
app.set("trust proxy", true);

// CORS
app.use(cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files — Featured Images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/vendor", require("./routes/vendorRoutes"));
app.use("/api/vendor/kyc", require("./routes/vendorKycRoutes"));
app.use("/api/contributor", require("./routes/contributorRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/post", require("./routes/postRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/product", require("./routes/productRoutes"));
app.use("/api/customer", require("./routes/customerRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/order", require("./routes/orderRoutes"));
// Health Route
app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
