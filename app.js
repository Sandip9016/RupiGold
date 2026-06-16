const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

require("dotenv").config();

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
app.use(cors());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files — Featured Images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/vendor", require("./routes/vendorRoutes"));
app.use("/api/post", require("./routes/postRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/product", require("./routes/productRoutes"));
// Health Route
app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
