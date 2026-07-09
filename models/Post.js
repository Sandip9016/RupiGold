const mongoose = require("mongoose");

const POST_CATEGORIES = [
  "Gold Rate Today",
  "Silver Price Update",
  "Investment Tips",
  "Business News",
  "Govt Yojana",
  "Saving & Loan Tips",
];

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: POST_CATEGORIES,
      required: true,
    },

    featuredImage: {
      type: String,
      required: true,
    },

    featuredImageWidth: {
      type: Number,
    },

    featuredImageHeight: {
      type: Number,
    },

    blogContent: {
      type: String,
      required: true,
    },

    wordCount: {
      type: Number,
      required: true,
    },

    upiId: {
      type: String,
      trim: true,
      default: null,
    },

    contributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contributor",
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Post", postSchema);
module.exports.POST_CATEGORIES = POST_CATEGORIES;
