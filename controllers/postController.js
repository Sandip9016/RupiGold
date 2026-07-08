const Post = require("../models/Post");
const Contributor = require("../models/Contributor");
const { POST_CATEGORIES } = require("../models/Post");
const fs = require("fs");
const nodemailer = require("nodemailer");

// ─── EMAIL TRANSPORTER ────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── EMAIL TEMPLATE: POST SUBMITTED ──────────────────────────
const postSubmittedTemplate = (contributorName, postTitle, category) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>Post Submitted</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#B8860B,#FFD700);padding:40px 40px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">✍️ RupiGold</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;letter-spacing:2px;text-transform:uppercase;">Content Publishing Platform</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px;">

              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1a1a2e;">Hello, ${contributorName} 👋</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
                Your post has been successfully submitted to <strong>RupiGold</strong>. Our editorial team will review it carefully and make a decision within <strong>24 hours</strong>.
              </p>

              <!-- POST CARD -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fafafa;border:1px solid #e8e0c8;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="background:#B8860B;padding:12px 20px;">
                    <p style="margin:0;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Submitted Post</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#1a1a2e;">${postTitle}</p>
                    <span style="display:inline-block;background:#FFF8DC;color:#B8860B;border:1px solid #FFD700;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${category}</span>
                  </td>
                </tr>
              </table>

              <!-- WHAT HAPPENS NEXT -->
              <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#1a1a2e;">What happens next?</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="width:36px;height:36px;background:#FFF8DC;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px;">🔍</td>
                      <td style="padding-left:14px;font-size:14px;color:#444;line-height:1.6;">Our team reviews your content for quality and accuracy.</td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="width:36px;height:36px;background:#FFF8DC;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px;">⏱️</td>
                      <td style="padding-left:14px;font-size:14px;color:#444;line-height:1.6;">You will receive a decision email within <strong>24 hours</strong>.</td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="width:36px;height:36px;background:#FFF8DC;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px;">🚀</td>
                      <td style="padding-left:14px;font-size:14px;color:#444;line-height:1.6;">Once approved, your post goes live and reaches thousands of readers.</td>
                    </tr></table>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#888;line-height:1.7;">
                While you wait, feel free to prepare your next post. Consistent publishing helps build your audience on RupiGold. Thank you for contributing quality financial content to our community! 🙏
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#1a1a2e;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;color:#FFD700;font-size:14px;font-weight:600;">RupiGold — India's Gold & Finance Platform</p>
              <p style="margin:0;color:rgba(255,255,255,0.45);font-size:12px;">This is an automated email. Please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;

// ─── EMAIL TEMPLATE: POST APPROVED ───────────────────────────
const postApprovedTemplate = (contributorName, postTitle, category) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>Post Approved</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a7a4a,#2ecc71);padding:40px 40px 30px;text-align:center;">
              <div style="width:70px;height:70px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 16px;display:table-cell;vertical-align:middle;text-align:center;font-size:32px;">✅</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Post Approved!</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your content is now live on RupiGold</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px;">

              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1a1a2e;">Congratulations, ${contributorName}! 🎉</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
                Great news! Your post has been <strong style="color:#1a7a4a;">approved</strong> by our editorial team and is now live on the RupiGold platform. Readers can discover and engage with your content right now.
              </p>

              <!-- POST CARD -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f0fff6;border:1px solid #a8e6c1;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="background:#1a7a4a;padding:12px 20px;">
                    <p style="margin:0;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">✅ Approved Post</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#1a1a2e;">${postTitle}</p>
                    <span style="display:inline-block;background:#e8f8ee;color:#1a7a4a;border:1px solid #a8e6c1;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${category}</span>
                  </td>
                </tr>
              </table>

              <!-- TIPS -->
              <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#1a1a2e;">Keep the momentum going 🚀</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;height:36px;background:#e8f8ee;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px;">📢</td>
                    <td style="padding-left:14px;font-size:14px;color:#444;line-height:1.6;">Share your published post on social media to maximize reach.</td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;height:36px;background:#e8f8ee;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px;">✍️</td>
                    <td style="padding-left:14px;font-size:14px;color:#444;line-height:1.6;">Submit your next post — consistent creators get featured on our homepage.</td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:10px 0;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;height:36px;background:#e8f8ee;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px;">💰</td>
                    <td style="padding-left:14px;font-size:14px;color:#444;line-height:1.6;">Earnings (if applicable) will be processed to your registered UPI ID.</td>
                  </tr></table>
                </td></tr>
              </table>

              <p style="margin:0;font-size:14px;color:#888;line-height:1.7;">
                Thank you for being a valued contributor to RupiGold. Your insights help millions of Indians make smarter financial decisions. Keep writing! 💛
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#1a1a2e;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;color:#FFD700;font-size:14px;font-weight:600;">RupiGold — India's Gold & Finance Platform</p>
              <p style="margin:0;color:rgba(255,255,255,0.45);font-size:12px;">This is an automated email. Please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;

// ─── EMAIL TEMPLATE: POST REJECTED ───────────────────────────
const postRejectedTemplate = (contributorName, postTitle, category) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>Post Rejected</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#c0392b,#e74c3c);padding:40px 40px 30px;text-align:center;">
              <div style="font-size:40px;margin-bottom:12px;">❌</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Post Not Approved</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Don't worry — you can resubmit after improvements</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px;">

              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#1a1a2e;">Hello, ${contributorName}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
                After careful review, our editorial team has decided <strong style="color:#c0392b;">not to approve</strong> your post at this time. This doesn't mean your content is bad — it may just need some adjustments to meet our publishing standards.
              </p>

              <!-- POST CARD -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fff5f5;border:1px solid #f5c6c6;border-radius:12px;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="background:#c0392b;padding:12px 20px;">
                    <p style="margin:0;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">❌ Rejected Post</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#1a1a2e;">${postTitle}</p>
                    <span style="display:inline-block;background:#fff0f0;color:#c0392b;border:1px solid #f5c6c6;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">${category}</span>
                  </td>
                </tr>
              </table>

              <!-- COMMON REASONS -->
              <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#1a1a2e;">Common reasons for rejection:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;height:36px;background:#fff0f0;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px;">📋</td>
                    <td style="padding-left:14px;font-size:14px;color:#444;line-height:1.6;">Content does not match the selected category accurately.</td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;height:36px;background:#fff0f0;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px;">🔍</td>
                    <td style="padding-left:14px;font-size:14px;color:#444;line-height:1.6;">Information appears inaccurate or lacks credible sources.</td>
                  </tr></table>
                </td></tr>
                <tr><td style="padding:10px 0;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;height:36px;background:#fff0f0;border-radius:50%;text-align:center;vertical-align:middle;font-size:16px;">✍️</td>
                    <td style="padding-left:14px;font-size:14px;color:#444;line-height:1.6;">Writing quality or structure needs improvement.</td>
                  </tr></table>
                </td></tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#fff8e1;border:1px solid #ffe082;border-radius:12px;margin-bottom:28px;">
                <tr><td style="padding:20px;">
                  <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a1a2e;">💡 What to do next?</p>
                  <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
                    Revise your content based on the points above, ensure all information is factually accurate, and resubmit. Our team reviews every submission fairly and we'd love to see your improved post go live!
                  </p>
                </td></tr>
              </table>

              <p style="margin:0;font-size:14px;color:#888;line-height:1.7;">
                We appreciate your effort and encourage you to keep writing. Every great writer faces rejection — it's part of the journey. We look forward to your next submission! 🙏
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#1a1a2e;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;color:#FFD700;font-size:14px;font-weight:600;">RupiGold — India's Gold & Finance Platform</p>
              <p style="margin:0;color:rgba(255,255,255,0.45);font-size:12px;">This is an automated email. Please do not reply.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;

// ─── WORD COUNT ───────────────────────────────────────────────
const countWords = (text) => {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
};

// ─── CREATE POST ──────────────────────────────────────────────
// Protected — Contributor only (via contributorProtect middleware)
const createPost = async (req, res) => {
  try {
    const { title, category, blogContent, upiId } = req.body;

    console.log("=================================");
    console.log("📥 CREATE POST API CALLED");
    console.log("👤 Contributor ID:", req.contributor.id);
    console.log("=================================");

    if (!title || title.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    if (!category || category.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Category is required" });
    }

    if (!POST_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Choose from: ${POST_CATEGORIES.join(", ")}`,
      });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Featured Image is required" });
    }

    if (!blogContent || blogContent.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Blog Content is required" });
    }

    const wordCount = countWords(blogContent);
    if (wordCount < 1000) {
      return res.status(400).json({
        success: false,
        message: "Please complete 1000 words",
        wordCount,
        required: 1000,
      });
    }

    const post = await Post.create({
      title: title.trim(),
      category,
      featuredImage: req.file.secure_url,
      blogContent,
      wordCount,
      upiId: upiId && upiId.trim() !== "" ? upiId.trim() : null,
      contributor: req.contributor.id,
      status: "Pending",
    });

    console.log("✅ Post created:", post._id);

    // SEND EMAIL TO CONTRIBUTOR
    try {
      const contributor = await Contributor.findById(req.contributor.id).select(
        "email name",
      );
      await transporter.sendMail({
        from: `"RupiGold" <${process.env.EMAIL_USER}>`,
        to: contributor.email,
        subject: "✍️ Your Post Has Been Submitted — RupiGold",
        html: postSubmittedTemplate(
          contributor.name,
          post.title,
          post.category,
        ),
      });
      console.log("📧 Submission email sent to:", contributor.email);
    } catch (emailErr) {
      console.log("⚠️ Email send failed (non-blocking):", emailErr.message);
    }

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
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── MY POSTS ─────────────────────────────────────────────────
// Protected — Contributor only
const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ contributor: req.contributor.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, total: posts.length, posts });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── APPROVED POSTS (Public) ──────────────────────────────────
const getApprovedPosts = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: "Approved" };
    if (category && POST_CATEGORIES.includes(category))
      filter.category = category;

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .populate("contributor", "name profilePic");

    res.status(200).json({ success: true, total: posts.length, posts });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── ALL POSTS — ADMIN ────────────────────────────────────────
const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("contributor", "name email phone");

    res.status(200).json({ success: true, total: posts.length, posts });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── APPROVE / REJECT — ADMIN ─────────────────────────────────
const updatePostStatus = async (req, res) => {
  try {
    const { postId } = req.params;
    const { status } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'Approved' or 'Rejected'",
      });
    }

    const post = await Post.findById(postId).populate(
      "contributor",
      "email name",
    );
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    post.status = status;
    await post.save();

    // SEND EMAIL TO CONTRIBUTOR
    try {
      const contributorEmail = post.contributor.email;
      const contributorName = post.contributor.name;

      const emailHtml =
        status === "Approved"
          ? postApprovedTemplate(contributorName, post.title, post.category)
          : postRejectedTemplate(contributorName, post.title, post.category);

      const emailSubject =
        status === "Approved"
          ? "🎉 Your Post is Approved & Live — RupiGold"
          : "❌ Your Post Was Not Approved — RupiGold";

      await transporter.sendMail({
        from: `"RupiGold" <${process.env.EMAIL_USER}>`,
        to: contributorEmail,
        subject: emailSubject,
        html: emailHtml,
      });
      console.log(`📧 ${status} email sent to:`, contributorEmail);
    } catch (emailErr) {
      console.log("⚠️ Email send failed (non-blocking):", emailErr.message);
    }

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
