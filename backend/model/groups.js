const mongoose = require("mongoose");

const groupsSchema = new mongoose.Schema({
  group_name: {
    type: String,
    required: [true, "Please enter a group name!"],
    trim: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient member lookup
groupsSchema.index({ members: 1 });

module.exports = mongoose.model("Groups", groupsSchema);

/**
 * Example Document:
 * {
 *   "_id": ObjectId("650a1b2c3d4e5f6789012346"),
 *   "group_name": "Family Shopping Group",
 *   "members": [
 *     ObjectId("650a1b2c3d4e5f6789012340"),
 *     ObjectId("650a1b2c3d4e5f6789012341"),
 *     ObjectId("650a1b2c3d4e5f6789012342")
 *   ],
 *   "created_at": ISODate("2024-01-16T18:00:00Z"),
 *   "__v": 0
 * }
 */