const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  search_history: [
    {
      keyword: {
        type: String,
        required: true,
      },
      searched_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  clicked_products: [
    {
      product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      clicked_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  viewed_products: [
    {
      product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      viewed_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  last_updated: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries by user
userActivitySchema.index({ user_id: 1 });

module.exports = mongoose.model("UserActivity", userActivitySchema);

/**
 * Example Document:
 * {
 *   "_id": ObjectId("650a1b2c3d4e5f6789012341"),
 *   "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
 *   "search_history": [
 *     {
 *       "keyword": "wireless headphones",
 *       "searched_at": ISODate("2024-01-15T10:30:00Z")
 *     },
 *     {
 *       "keyword": "laptop stand",
 *       "searched_at": ISODate("2024-01-16T14:45:00Z")
 *     }
 *   ],
 *   "clicked_products": [
 *     ObjectId("650a1b2c3d4e5f6789012350"),
 *     ObjectId("650a1b2c3d4e5f6789012351")
 *   ],
 *   "viewed_products": [
 *     ObjectId("650a1b2c3d4e5f6789012350"),
 *     ObjectId("650a1b2c3d4e5f6789012352"),
 *     ObjectId("650a1b2c3d4e5f6789012353")
 *   ],
 *   "last_updated": ISODate("2024-01-16T15:00:00Z"),
 *   "__v": 0
 * }
 */