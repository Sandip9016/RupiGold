const express = require("express");
const router = express.Router();

const {
  createPost,
  getMyPosts,
  getApprovedPosts,
  getAllPosts,
  updatePostStatus,
  incrementPostViews,
} = require("../controllers/postController");

const {
  contributorProtect,
  adminOnly,
} = require("../middleware/authMiddleware");
const { postImageUpload } = require("../middleware/uploadMiddleware");

// ── PUBLIC ────────────────────────────────────────────────────
router.get("/approved", getApprovedPosts);
router.patch("/:postId/view", incrementPostViews);

// ── CONTRIBUTOR (Protected) ─────────────────────────────────────
router.post(
  "/create",
  contributorProtect,
  postImageUpload.single("featuredImage"),
  createPost,
);
router.get("/my-posts", contributorProtect, getMyPosts);

// ── ADMIN ─────────────────────────────────────────────────────
router.get("/all", adminOnly, getAllPosts);
router.patch("/update-status/:postId", adminOnly, updatePostStatus);

module.exports = router;
