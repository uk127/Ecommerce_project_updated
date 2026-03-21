const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your product name!"],
  },
  description: {
    type: String,
    required: [true, "Please enter your product description!"],
  },
  category: {
    type: String,
    required: [true, "Please enter your product category!"],
  },
  productType: {
    type: String,
  },
  brand: {
    type: String,
  },
  tags: {
    type: [String],
    default: [],
  },
  originalPrice: {
    type: Number,
  },
  discountPrice: {
    type: Number,
    required: [true, "Please enter your product price!"],
  },
  unit: {
    type: String,
  },
  stock: {
    type: Number,
    required: [true, "Please enter your product stock!"],
  },
  expiryDate: {
    type: Date,
  },
  images: [
    {
      type: String,
    },
  ],

  reviews: [
    {
      user: {
        type: Object,
      },
      rating: {
        type: Number,
      },
      comment: {
        type: String,
      },
      productId: {
        type: String,
      },
      createdAt: {
        type: Date,
        default: Date.now(),
      },
    },
  ],
  ratings: {
    type: Number,
  },
  shopId: {
    type: String,
    required: true,
  },
  shop: {
    type: Object,
    required: true,
  },
  sold_out: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

// Add text index for search functionality
productSchema.index({
  name: "text",
  description: "text",
  category: "text",
  tags: "text",
  productType: "text",
  brand: "text"
}, {
  weights: {
    name: 5,       // Name has highest weight
    description: 3,
    category: 2,
    tags: 1,
    productType: 2,
    brand: 2
  },
  name: "ProductTextIndex"
});

module.exports = mongoose.model("Product", productSchema);
