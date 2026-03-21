const mongoose = require("mongoose");

const productViewsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  viewed_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
productViewsSchema.index({ user_id: 1, product_id: 1 });
productViewsSchema.index({ viewed_at: -1 });

module.exports = mongoose.model("ProductViews", productViewsSchema);

/**
 * Example Document:
 * {
 *   "_id": ObjectId("650a1b2c3d4e5f6789012342"),
 *   "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
 *   "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
 *   "viewed_at": ISODate("2024-01-16T14:30:00Z"),
 *   "__v": 0
 * }
 */