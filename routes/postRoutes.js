const express = require("express");
const router = express.Router();

const {
  createPost,
  getMyPosts,
  getApprovedPosts,
  getAllPosts,
  updatePostStatus,
} = require("../controllers/postController");

const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// ── PUBLIC ────────────────────────────────────────────────────
router.get("/approved", getApprovedPosts);

// ── VENDOR (Protected) ────────────────────────────────────────
router.post("/create", protect, upload.single("featuredImage"), createPost);
router.get("/my-posts", protect, getMyPosts);

// ── ADMIN ─────────────────────────────────────────────────────
router.get("/all", adminOnly, getAllPosts);
router.patch("/update-status/:postId", adminOnly, updatePostStatus);

module.exports = router;
