const Post = require("../models/Post");
const { POST_CATEGORIES } = require("../models/Post");
const fs = require("fs");

const countWords = (text) => {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
};

// CREATE POST
const createPost = async (req, res) => {
  try {
    const { title, category, blogContent, upiId } = req.body;

    console.log("=================================");
    console.log("📥 CREATE POST API CALLED");
    console.log("👤 Vendor ID:", req.vendor.id);
    console.log("=================================");

    // 1. TITLE
    if (!title || title.trim() === "") {
      if (req.file) fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    // 2. CATEGORY
    if (!category || category.trim() === "") {
      if (req.file) fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ success: false, message: "Category is required" });
    }

    if (!POST_CATEGORIES.includes(category)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `Invalid category. Choose from: ${POST_CATEGORIES.join(", ")}`,
      });
    }

    // 3. FEATURED IMAGE
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Featured Image is required" });
    }

    // 4. BLOG CONTENT
    if (!blogContent || blogContent.trim() === "") {
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ success: false, message: "Blog Content is required" });
    }

    const wordCount = countWords(blogContent);
    console.log(`📊 Word Count: ${wordCount}`);

    if (wordCount < 1000) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Please complete 1000 words",
        wordCount,
        required: 1000,
      });
    }

    // 5. CREATE POST
    const post = await Post.create({
      title: title.trim(),
      category,
      featuredImage: req.file.path,
      blogContent,
      wordCount,
      upiId: upiId && upiId.trim() !== "" ? upiId.trim() : null,
      vendor: req.vendor.id,
      status: "Pending",
    });

    console.log("✅ Post created:", post._id);

    res.status(201).json({
      success: true,
      message:
        "Post submitted successfully. It will go live after Admin approval.",
      post: {
        _id: post._id,
        title: post.title,
        category: post.category,
        wordCount: post.wordCount,
        status: post.status,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    console.log("❌ Create Post Error:", error.message);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// MY POSTS
const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ vendor: req.vendor.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, total: posts.length, posts });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// APPROVED POSTS (Public)
const getApprovedPosts = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: "Approved" };
    if (category && POST_CATEGORIES.includes(category))
      filter.category = category;

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .populate("vendor", "businessName ownerDirectorName");

    res.status(200).json({ success: true, total: posts.length, posts });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ALL POSTS — ADMIN
const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("vendor", "businessName ownerDirectorName email mobileNumber");

    res.status(200).json({ success: true, total: posts.length, posts });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// APPROVE / REJECT — ADMIN
const updatePostStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Status must be 'Approved' or 'Rejected'",
        });
    }

    const post = await Post.findById(postId);
    if (!post)
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });

    post.status = status;
    await post.save();

    res
      .status(200)
      .json({ success: true, message: `Post ${status} successfully`, post });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

module.exports = {
  createPost,
  getMyPosts,
  getApprovedPosts,
  getAllPosts,
  updatePostStatus,
};
