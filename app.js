const express = require("express");
const cors = require("cors");
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

// Routes
app.use("/api/vendor", require("./routes/vendorRoutes"));

// Health Route
app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
