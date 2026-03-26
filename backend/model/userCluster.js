/**
 * User Cluster Model
 * 
 * Stores user segment assignments from K-means clustering.
 * This allows recommendation APIs to quickly look up a user's segment
 * without recalculating clustering results.
 */

const mongoose = require("mongoose");

const userClusterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // Each user should only have one cluster assignment
  },
  cluster: {
    type: Number,
    required: true,
    min: 0,
  },
  segment: {
    type: String,
    required: true,
    enum: ["budget", "regular", "premium"], // Valid segment labels
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster lookups by userId
userClusterSchema.index({ userId: 1 });

// Index for finding users by segment
userClusterSchema.index({ segment: 1 });

/**
 * Get a user's segment
 * @param {String} userId - User ID
 * @returns {Promise<Object|null>} User cluster document or null
 */
userClusterSchema.statics.getUserSegment = async function (userId) {
  return this.findOne({ userId }).lean();
};

/**
 * Get all users in a specific segment
 * @param {String} segment - Segment name (budget, regular, premium)
 * @returns {Promise<Array>} Array of user cluster documents
 */
userClusterSchema.statics.getUsersBySegment = async function (segment) {
  return this.find({ segment }).lean();
};

/**
 * Get segment distribution summary
 * @returns {Promise<Object>} Count of users per segment
 */
userClusterSchema.statics.getSegmentSummary = async function () {
  return this.aggregate([
    {
      $group: {
        _id: "$segment",
        count: { $sum: 1 },
      },
    },
  ]);
};

module.exports = mongoose.model("UserCluster", userClusterSchema);

/**
 * Example Document:
 * {
 *   "_id": ObjectId("..."),
 *   "userId": ObjectId("..."),
 *   "cluster": 0,
 *   "segment": "budget",
 *   "createdAt": ISODate("2024-01-15T10:30:00Z")
 * }
 */