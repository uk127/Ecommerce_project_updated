const mongoose = require("mongoose");

const aiCartItemSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  imageUrl: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
aiCartItemSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Compound index for efficient queries
aiCartItemSchema.index({ sessionId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("AICart", aiCartItemSchema);