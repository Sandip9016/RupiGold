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
// GET all approved posts (optionally filter by ?category=Gold Rate Today)
router.get("/approved", getApprovedPosts);

// ── VENDOR (Protected) ────────────────────────────────────────
// POST create new post
router.post("/create", protect, upload.single("featuredImage"), createPost);

// GET my own posts
router.get("/my-posts", protect, getMyPosts);

// ── ADMIN (Protected + Admin Role) ───────────────────────────
// GET all posts
router.get("/all", protect, adminOnly, getAllPosts);

// PATCH approve or reject a post
router.patch("/update-status/:postId", protect, adminOnly, updatePostStatus);

module.exports = router;
