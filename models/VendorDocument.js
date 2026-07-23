const mongoose = require("mongoose");

const vendorDocumentSchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    doc_type: {
      type: String,
      enum: [
        "pan_card",
        "gst_cert",
        "shop_act",
        "coi_certificate",
        "cancelled_cheque",
        "bis_license",
        "shop_photo_1",
        "shop_photo_2",
        "shop_photo_3",
        "aadhaar_masked",
        "owner_photo",
      ],
      required: true,
    },

    file_url: {
      type: String,
      required: true,
    },

    // Only populated for shop_photo_* (owner selfie must be geo-tagged
    // per client's "Geo Tag ON करके" requirement)
    geo_lat: {
      type: Number,
      default: null,
    },

    geo_lng: {
      type: Number,
      default: null,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    verified_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// A vendor should only ever have ONE current doc per doc_type —
// re-upload replaces, doesn't duplicate.
vendorDocumentSchema.index({ vendor_id: 1, doc_type: 1 }, { unique: true });

module.exports = mongoose.model("VendorDocument", vendorDocumentSchema);
