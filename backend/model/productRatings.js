const mongoose = require("mongoose");

const productRatingsSchema = new mongoose.Schema({
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    default: "",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for unique user-product rating and efficient queries
productRatingsSchema.index({ user_id: 1, product_id: 1 }, { unique: true });
productRatingsSchema.index({ product_id: 1 });

module.exports = mongoose.model("ProductRatings", productRatingsSchema);

/**
 * Example Document:
 * {
 *   "_id": ObjectId("650a1b2c3d4e5f6789012343"),
 *   "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
 *   "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
 *   "rating": 4,
 *   "review": "Great product! Good quality and fast delivery.",
 *   "created_at": ISODate("2024-01-16T15:30:00Z"),
 *   "__v": 0
 * }
 */