const multer = require("multer");
const CloudinaryStorage = require("multer-storage-cloudinary");
const cloudinaryModule = require("cloudinary");
const cloudinary = cloudinaryModule.v2;

// ─── CLOUDINARY CONFIG ────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── FILE FILTER — IMAGES ONLY ─────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP images allowed"), false);
  }
};

// ─── FILE FILTER — KYC DOCS (images + PDF, certs can be either) ──
const docFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP, or PDF files allowed"), false);
  }
};

// ─── UPLOADER FACTORY ─────────────────────────────────────────
const makeUploader = (folder) => {
  const storage = CloudinaryStorage({
    cloudinary: cloudinaryModule,
    params: {
      folder,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [
        { width: 1280, height: 720, crop: "limit", quality: "auto" },
      ],
    },
  });

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max
    },
  });
};

// ─── KYC DOC UPLOADER FACTORY (images + PDF, no transform) ─────
const makeDocUploader = (folder) => {
  const storage = CloudinaryStorage({
    cloudinary: cloudinaryModule,
    params: {
      folder,
      resource_type: "auto", // lets PDFs through untouched
      allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
    },
  });

  return multer({
    storage,
    fileFilter: docFileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max
    },
  });
};

// ─── UPLOADERS ────────────────────────────────────────────────
const postImageUpload = makeUploader("rupigold/posts");
const productImageUpload = makeUploader("rupigold/products");
const profilePicUpload = makeUploader("rupigold/profile");
const vendorKycUpload = makeDocUploader("rupigold/vendor-kyc");

module.exports = {
  postImageUpload,
  productImageUpload,
  profilePicUpload,
  vendorKycUpload,
};
