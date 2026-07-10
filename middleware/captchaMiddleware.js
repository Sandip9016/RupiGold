// ─── GOOGLE reCAPTCHA v2 VERIFICATION ──────────────────────────
// Verifies the "g-recaptcha-response" token sent from the frontend
// widget against Google's siteverify API before allowing the
// protected action (e.g. blog post creation) to proceed.

const verifyCaptcha = async (req, res, next) => {
  try {
    console.log("=================================");
    console.log("🤖 CAPTCHA VERIFY MIDDLEWARE CALLED");

    const body = req.body || {};
    const captchaToken = body.captchaToken || body["g-recaptcha-response"];

    console.log("📦 req.body keys:", Object.keys(body));
    console.log(
      "🔑 captchaToken received:",
      captchaToken ? `${captchaToken.slice(0, 15)}...` : "MISSING",
    );

    if (!captchaToken || captchaToken.trim() === "") {
      console.log("❌ Captcha token missing — rejecting request");
      return res.status(400).json({
        success: false,
        message: "Captcha verification is required",
      });
    }

    if (!process.env.RECAPTCHA_SECRET_KEY) {
      console.log("❌ RECAPTCHA_SECRET_KEY missing in environment");
      return res.status(500).json({
        success: false,
        message: "Server Error",
      });
    }

    const params = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: captchaToken,
    });

    // Forward client IP too — optional but recommended by Google
    const clientIp =
      req.ip === "::1" || req.ip === "127.0.0.1"
        ? "127.0.0.1"
        : req.ip?.replace("::ffff:", "");
    if (clientIp) params.append("remoteip", clientIp);

    console.log(
      "🌐 Verifying with Google siteverify... IP:",
      clientIp || "unknown",
    );

    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );

    const data = await response.json();
    console.log("📨 Google siteverify response:", data);

    if (!data.success) {
      console.log("⚠️ Captcha verification failed:", data["error-codes"]);
      return res.status(400).json({
        success: false,
        message: "Captcha verification failed. Please try again.",
      });
    }

    console.log("✅ Captcha verified successfully");
    next();
  } catch (error) {
    console.log("❌ Captcha Middleware Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = { verifyCaptcha };
