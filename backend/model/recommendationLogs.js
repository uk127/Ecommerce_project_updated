const mongoose = require("mongoose");

const recommendationLogsSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recommended_products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  algorithm_used: {
    type: String,
    required: true,
    enum: ["collaborative", "content-based", "hybrid", "trending", "personalized"],
  },
  generated_at: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries by user and time
recommendationLogsSchema.index({ user_id: 1, generated_at: -1 });
recommendationLogsSchema.index({ algorithm_used: 1 });

module.exports = mongoose.model("RecommendationLogs", recommendationLogsSchema);

/**
 * Example Document:
 * {
 *   "_id": ObjectId("650a1b2c3d4e5f6789012344"),
 *   "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
 *   "recommended_products": [
 *     ObjectId("650a1b2c3d4e5f6789012350"),
 *     ObjectId("650a1b2c3d4e5f6789012351"),
 *     ObjectId("650a1b2c3d4e5f6789012352"),
 *     ObjectId("650a1b2c3d4e5f6789012353"),
 *     ObjectId("650a1b2c3d4e5f6789012354")
 *   ],
 *   "algorithm_used": "hybrid",
 *   "generated_at": ISODate("2024-01-16T16:00:00Z"),
 *   "__v": 0
 * }
 */