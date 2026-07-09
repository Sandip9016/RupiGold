const mongoose = require("mongoose");

const postViewSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    ip: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

postViewSchema.index({ postId: 1, ip: 1 }, { unique: true });

module.exports = mongoose.model("PostView", postViewSchema);
