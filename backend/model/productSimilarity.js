const mongoose = require("mongoose");

const productSimilaritySchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  similar_products: [
    {
      product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      similarity_score: {
        type: Number,
        required: true,
        min: 0,
        max: 1,
      },
    },
  ],
  last_updated: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient product lookup
productSimilaritySchema.index({ product_id: 1 }, { unique: true });

module.exports = mongoose.model("ProductSimilarity", productSimilaritySchema);

/**
 * Example Document:
 * {
 *   "_id": ObjectId("650a1b2c3d4e5f6789012345"),
 *   "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
 *   "similar_products": [
 *     {
 *       "product_id": ObjectId("650a1b2c3d4e5f6789012351"),
 *       "similarity_score": 0.95
 *     },
 *     {
 *       "product_id": ObjectId("650a1b2c3d4e5f6789012352"),
 *       "similarity_score": 0.87
 *     },
 *     {
 *       "product_id": ObjectId("650a1b2c3d4e5f6789012353"),
 *       "similarity_score": 0.82
 *     },
 *     {
 *       "product_id": ObjectId("650a1b2c3d4e5f6789012354"),
 *       "similarity_score": 0.75
 *     }
 *   ],
 *   "last_updated": ISODate("2024-01-16T17:00:00Z"),
 *   "__v": 0
 * }
 */