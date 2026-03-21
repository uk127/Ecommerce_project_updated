const mongoose = require("mongoose");

const groupRatingsSchema = new mongoose.Schema({
  group_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Groups",
    required: true,
  },
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  ratings: [
    {
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for unique group-product rating
groupRatingsSchema.index({ group_id: 1, product_id: 1 }, { unique: true });

module.exports = mongoose.model("GroupRatings", groupRatingsSchema);

/**
 * Example Document:
 * {
 *   "_id": ObjectId("650a1b2c3d4e5f6789012347"),
 *   "group_id": ObjectId("650a1b2c3d4e5f6789012346"),
 *   "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
 *   "ratings": [
 *     {
 *       "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
 *       "rating": 5
 *     },
 *     {
 *       "user_id": ObjectId("650a1b2c3d4e5f6789012341"),
 *       "rating": 4
 *     },
 *     {
 *       "user_id": ObjectId("650a1b2c3d4e5f6789012342"),
 *       "rating": 4
 *     }
 *   ],
 *   "created_at": ISODate("2024-01-16T19:00:00Z"),
 *   "__v": 0
 * }
 */