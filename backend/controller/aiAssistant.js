const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const express = require("express");
const router = express.Router();
const Product = require("../model/product");
const AICart = require("../model/aiCart");
const { getAIIntent } = require("../utils/aiService");

/**
 * Main chat endpoint - handles all AI assistant interactions
 */
router.post(
  "/chat",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { message, sessionId } = req.body;

      if (!message || message.trim() === "") {
        return next(new ErrorHandler("Message is required", 400));
      }

      // Get or create session ID for cart management
      const cartSessionId = sessionId || generateSessionId();

      // Step 1: Get intent from AI
      const aiResponse = await getAIIntent(message.trim());
      console.log(aiResponse);
      // Step 2: Handle based on intent
      let result = {};

      switch (aiResponse.intent) {
        case "AddToCart":
          result = await handleAddToCart(aiResponse, cartSessionId);
          break;

        case "CheckAvailability":
          result = await handleCheckAvailability(aiResponse);
          break;

        case "GetPrice":
          result = await handleGetPrice(aiResponse);
          break;

        case "RemoveFromCart":
          result = await handleRemoveFromCart(aiResponse, cartSessionId);
          break;

        case "ShowCart":
          result = await handleShowCart(cartSessionId);
          break;

        case "RecommendProducts":
          result = await handleRecommendProducts(aiResponse);
          break;

        case "SortByPrice":
          result = await handleSortByPrice(aiResponse);
          break;

        case "PopularProducts":
          result = await handlePopularProducts();
          break;

        case "AutoSearch":
          result = handleAutoSearch(aiResponse);
          break;

        case "Payment":
          result = handlePayment();
          break;

        case "RecipeIngredients":
          result = await handleRecipeIngredients(aiResponse);
          break;

        case "Unknown":
        default:
          result = {
            success: true,
            message: aiResponse.reply,
            intent: "Unknown",
            data: null,
          };
          break;
      }

      // Add session ID to response
      result.sessionId = cartSessionId;

      res.status(200).json(result);
    } catch (error) {
      console.error("Chat endpoint error:", error);
      return next(new ErrorHandler(error.message || "Internal server error", 500));
    }
  })
);

/**
 * Handle AddToCart intent
 */
async function handleAddToCart(aiResponse, sessionId) {
  const results = [];
  const products = [];
  const notFound = [];

  for (const productRequest of aiResponse.products) {
    // Search for product in database
    const product = await findProductByName(productRequest.name);

    if (product) {
      // Check stock availability
      if (product.stock < productRequest.quantity) {
        results.push({
          success: false,
          productName: product.name,
          message: `Sorry, only ${product.stock} ${product.name}(s) available in stock.`,
        });
        continue;
      }

      // Check if already in cart
      let cartItem = await AICart.findOne({
        sessionId,
        productId: product._id,
      });

      if (cartItem) {
        // Update quantity
        cartItem.quantity += productRequest.quantity;
        cartItem.updatedAt = Date.now();
        await cartItem.save();
        results.push({
          success: true,
          productName: product.name,
          quantity: cartItem.quantity,
          price: product.discountPrice,
          message: `Updated ${product.name} quantity to ${cartItem.quantity} in your cart.`,
        });
      } else {
        // Create new cart item
        cartItem = new AICart({
          sessionId,
          productId: product._id,
          productName: product.name,
          quantity: productRequest.quantity,
          price: product.discountPrice,
          imageUrl: product.images && product.images.length > 0 ? product.images[0] : null,
        });
        await cartItem.save();
        results.push({
          success: true,
          productName: product.name,
          quantity: productRequest.quantity,
          price: product.discountPrice,
          message: `Added ${productRequest.quantity} ${product.name}(s) to your cart at ₹${product.discountPrice} each.`,
        });
      }

      // Add full product data for Redux cart
      products.push({
        _id: product._id,
        name: product.name,
        discountPrice: product.discountPrice,
        originalPrice: product.originalPrice,
        stock: product.stock,
        images: product.images,
        shop: product.shop,
        shopId: product.shopId,
        quantity: productRequest.quantity,
      });
    } else {
      notFound.push(productRequest.name);
    }
  }

  // Build response message
  let responseMessage = "";
  if (results.length > 0) {
    responseMessage = results.map((r) => r.message).join(" ");
  }
  if (notFound.length > 0) {
    responseMessage += ` Sorry, I couldn't find "${notFound.join(", ")}" in our catalog.`;
  }

  return {
    success: true,
    intent: "AddToCart",
    message: responseMessage || aiResponse.reply,
    data: {
      addedItems: results.filter((r) => r.success),
      products, // Full product data for Redux cart
      notFound,
    },
  };
}

/**
 * Handle CheckAvailability intent
 */
async function handleCheckAvailability(aiResponse) {
  const results = [];

  for (const productRequest of aiResponse.products) {
    const product = await findProductByName(productRequest.name);

    if (product) {
      results.push({
        productName: product.name,
        available: product.stock > 0,
        stock: product.stock,
        message:
          product.stock > 0
            ? `${product.name} is available! We have ${product.stock} in stock.`
            : `Sorry, ${product.name} is currently out of stock.`,
      });
    } else {
      results.push({
        productName: productRequest.name,
        available: false,
        stock: 0,
        message: `Sorry, I couldn't find "${productRequest.name}" in our catalog.`,
      });
    }
  }

  return {
    success: true,
    intent: "CheckAvailability",
    message: results.map((r) => r.message).join(" ") || aiResponse.reply,
    data: { availability: results },
  };
}

/**
 * Handle GetPrice intent
 */
async function handleGetPrice(aiResponse) {
  const results = [];

  for (const productRequest of aiResponse.products) {
    const product = await findProductByName(productRequest.name);

    if (product) {
      const priceInfo = {
        productName: product.name,
        originalPrice: product.originalPrice,
        discountPrice: product.discountPrice,
        discount: product.originalPrice
          ? Math.round(((product.originalPrice - product.discountPrice) / product.originalPrice) * 100)
          : 0,
      };

      let message = `${product.name} is priced at ₹${product.discountPrice}`;
      if (product.originalPrice && product.originalPrice > product.discountPrice) {
        message += ` (Original: ₹${product.originalPrice}, ${priceInfo.discount}% off)`;
      }

      results.push({
        ...priceInfo,
        message,
      });
    } else {
      results.push({
        productName: productRequest.name,
        message: `Sorry, I couldn't find "${productRequest.name}" in our catalog.`,
        notFound: true,
      });
    }
  }

  return {
    success: true,
    intent: "GetPrice",
    message: results.map((r) => r.message).join(" ") || aiResponse.reply,
    data: { prices: results },
  };
}

/**
 * Handle RemoveFromCart intent
 */
async function handleRemoveFromCart(aiResponse, sessionId) {
  const results = [];

  for (const productRequest of aiResponse.products) {
    // Find cart item by product name (fuzzy match)
    const cartItem = await AICart.findOne({
      sessionId,
      productName: { $regex: new RegExp(productRequest.name, "i") },
    });

    if (cartItem) {
      const productId = cartItem.productId;
      await AICart.deleteOne({ _id: cartItem._id });
      results.push({
        success: true,
        productId: productId,
        productName: cartItem.productName,
        message: `Removed ${cartItem.productName} from your cart.`,
      });
    } else {
      results.push({
        success: false,
        productName: productRequest.name,
        message: `"${productRequest.name}" was not found in your cart.`,
      });
    }
  }

  return {
    success: true,
    intent: "RemoveFromCart",
    message: results.map((r) => r.message).join(" ") || aiResponse.reply,
    data: { removed: results },
  };
}

/**
 * Handle ShowCart intent
 */
async function handleShowCart(sessionId) {
  const cartItems = await AICart.find({ sessionId }).sort({ createdAt: -1 });

  if (cartItems.length === 0) {
    return {
      success: true,
      intent: "ShowCart",
      message: "Your cart is empty. Would you like me to help you find some products?",
      data: { items: [], total: 0 },
    };
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    success: true,
    intent: "ShowCart",
    message: `You have ${itemCount} item(s) in your cart totaling ₹${total}.`,
    data: {
      items: cartItems.map((item) => ({
        id: item._id,
        productId: item.productId,
        name: item.productName,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
        imageUrl: item.imageUrl,
      })),
      itemCount,
      total,
    },
  };
}

/**
 * Handle RecommendProducts intent
 */
async function handleRecommendProducts(aiResponse) {
  const query = {};

  // Add category filter if specified
  if (aiResponse.category) {
    query.category = { $regex: new RegExp(aiResponse.category, "i") };
  }

  // Get top rated products
  const products = await Product.find(query)
    .sort({ ratings: -1, sold_out: -1 })
    .limit(5)
    .select("name category discountPrice originalPrice ratings stock images sold_out");

  if (products.length === 0) {
    return {
      success: true,
      intent: "RecommendProducts",
      message: aiResponse.category
        ? `Sorry, I couldn't find any products in the "${aiResponse.category}" category.`
        : "Sorry, I couldn't find any products to recommend right now.",
      data: { products: [] },
    };
  }

  return {
    success: true,
    intent: "RecommendProducts",
    message: `Here are ${products.length} recommended products${aiResponse.category ? ` in ${aiResponse.category}` : ""}:`,
    data: {
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        category: p.category,
        price: p.discountPrice,
        originalPrice: p.originalPrice,
        rating: p.ratings,
        inStock: p.stock > 0,
        imageUrl: p.images && p.images.length > 0 ? p.images[0] : null,
      })),
    },
  };
}

/**
 * Handle SortByPrice intent
 */
async function handleSortByPrice(aiResponse) {
  const query = {};
  const sortOrder = aiResponse.sortOrder === "desc" ? -1 : 1;

  // Add category filter if specified
  if (aiResponse.category) {
    query.category = { $regex: new RegExp(aiResponse.category, "i") };
  }

  // Add product name filter if specified
  if (aiResponse.products.length > 0 && aiResponse.products[0].name) {
    query.name = { $regex: new RegExp(aiResponse.products[0].name, "i") };
  }

  const products = await Product.find(query)
    .sort({ discountPrice: sortOrder })
    .limit(10)
    .select("name category discountPrice originalPrice stock images");

  if (products.length === 0) {
    return {
      success: true,
      intent: "SortByPrice",
      message: "Sorry, I couldn't find any products matching your criteria.",
      data: { products: [] },
    };
  }

  const orderText = sortOrder === 1 ? "cheapest" : "most expensive";

  return {
    success: true,
    intent: "SortByPrice",
    message: `Here are the ${orderText} products${aiResponse.category ? ` in ${aiResponse.category}` : ""}:`,
    data: {
      sortOrder: aiResponse.sortOrder,
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        category: p.category,
        price: p.discountPrice,
        originalPrice: p.originalPrice,
        inStock: p.stock > 0,
        imageUrl: p.images && p.images.length > 0 ? p.images[0] : null,
      })),
    },
  };
}

/**
 * Handle PopularProducts intent
 */
async function handlePopularProducts() {
  const products = await Product.find({ stock: { $gt: 0 } })
    .sort({ sold_out: -1, ratings: -1 })
    .limit(10)
    .select("name category discountPrice originalPrice sold_out ratings images stock");

  if (products.length === 0) {
    return {
      success: true,
      intent: "PopularProducts",
      message: "Sorry, I couldn't find any popular products right now.",
      data: { products: [] },
    };
  }

  return {
    success: true,
    intent: "PopularProducts",
    message: `Here are our top ${products.length} bestselling products:`,
    data: {
      products: products.map((p) => ({
        id: p._id,
        name: p.name,
        category: p.category,
        price: p.discountPrice,
        originalPrice: p.originalPrice,
        soldCount: p.sold_out,
        rating: p.ratings,
        inStock: p.stock > 0,
        imageUrl: p.images && p.images.length > 0 ? p.images[0] : null,
      })),
    },
  };
}

/**
 * Handle AutoSearch intent - Returns search query for frontend to navigate
 */
function handleAutoSearch(aiResponse) {
  // Extract search query from AI response
  const searchQuery = aiResponse.searchQuery || 
    (aiResponse.products && aiResponse.products.length > 0 ? aiResponse.products[0].name : "");

  if (!searchQuery) {
    return {
      success: false,
      intent: "AutoSearch",
      message: "What would you like me to search for?",
      data: { searchQuery: "" },
    };
  }

  return {
    success: true,
    intent: "AutoSearch",
    message: `Searching for "${searchQuery}" for you!`,
    data: {
      searchQuery: searchQuery,
      navigateTo: `/search?q=${encodeURIComponent(searchQuery)}`,
    },
  };
}

/**
 * Handle Payment intent - Returns step-by-step payment guide
 */
function handlePayment() {
  const paymentGuide = {
    steps: [
      {
        step: 1,
        title: "Go to Cart",
        description: "Click on the cart icon in the header to view your cart items"
      },
      {
        step: 2,
        title: "Proceed to Checkout",
        description: "Click the 'Checkout' button to start the payment process"
      },
      {
        step: 3,
        title: "Shipping Information",
        description: "Fill in your shipping details:",
        fields: [
          "Full Name",
          "Email Address",
          "Phone Number",
          "Zip Code",
          "Country",
          "City"
        ]
      },
      {
        step: 4,
        title: "Payment Method",
        description: "Choose your preferred payment method:",
        options: [
          "Debit/Credit Card",
          "PayPal",
          "Cash on Delivery (COD)"
        ]
      },
      {
        step: 5,
        title: "Confirm Order",
        description: "Click the 'Confirm' button to complete your order"
      }
    ]
  };

  return {
    success: true,
    intent: "Payment",
    message: "Here's a step-by-step guide to complete your payment:",
    data: paymentGuide
  };
}

/**
 * Handle RecipeIngredients intent
 * AI provides ingredients list, we check availability in products database
 */
async function handleRecipeIngredients(aiResponse) {
  const recipeName = aiResponse.recipeName;
  const ingredients = aiResponse.ingredients || [];

  // If no recipe name, ask for clarification
  if (!recipeName) {
    return {
      success: true,
      intent: "RecipeIngredients",
      message: "Which recipe would you like the ingredients for? Try asking like 'ingredients for biryani' or 'what do I need to make pasta'.",
      data: {
        recipeName: "",
        ingredients: [],
        availableProducts: [],
        notFound: []
      },
    };
  }

  // If AI didn't return ingredients, provide a helpful message
  if (ingredients.length === 0) {
    return {
      success: true,
      intent: "RecipeIngredients",
      message: `I couldn't determine the ingredients for ${recipeName}. Could you try rephrasing your question?`,
      data: {
        recipeName: recipeName,
        ingredients: [],
        availableProducts: [],
        notFound: []
      },
    };
  }

  // Search for each ingredient in the products database
  const availableProducts = [];
  const notFound = [];

  for (const ingredient of ingredients) {
    // Skip very common items that might not be products (like water, salt)
    if (ingredient.toLowerCase() === "water" || ingredient.toLowerCase() === "salt to taste") {
      continue;
    }

    const product = await findProductByName(ingredient);

    if (product && product.stock > 0) {
      availableProducts.push({
        ingredient: ingredient,
        productId: product._id,
        name: product.name,
        price: product.discountPrice,
        originalPrice: product.originalPrice,
        stock: product.stock,
        image: product.images && product.images.length > 0 ? product.images[0] : null,
        shop: product.shop,
        shopId: product.shopId,
        available: true
      });
    } else {
      notFound.push(ingredient);
    }
  }

  // Build response message
  let message = ` Ingredients for **${recipeName}**:\n\n`;
  
  if (availableProducts.length > 0) {
    message += ` Available in store (${availableProducts.length}):\n`;
    availableProducts.forEach(p => {
      message += `• ${p.name} - ₹${p.price}\n`;
    });
  }
  
  if (notFound.length > 0) {
    message += `\n Not available: ${notFound.join(", ")}\n`;
  }
  
  message += `\n You can add the available items to your cart!`;

  return {
    success: true,
    intent: "RecipeIngredients",
    message: message,
    data: {
      recipeName: recipeName,
      ingredients: ingredients,
      availableProducts: availableProducts,
      notFound: notFound,
      totalAvailable: availableProducts.length,
      totalNotFound: notFound.length
    },
  };
}

/**
 * Helper function to find product by name (fuzzy search)
 */
async function findProductByName(name) {
  if (!name) return null;

  // Try exact match first
  let product = await Product.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  });

  // Try partial match
  if (!product) {
    product = await Product.findOne({
      name: { $regex: new RegExp(name, "i") },
    });
  }

  // Try searching in tags
  if (!product) {
    product = await Product.findOne({
      tags: { $regex: new RegExp(name, "i") },
    });
  }

  // Use text search as fallback
  if (!product) {
    const results = await Product.find(
      { $text: { $search: name } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(1);

    product = results[0] || null;
  }

  return product;
}

/**
 * Generate a unique session ID
 */
function generateSessionId() {
  return `ai_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get cart by session ID
 */
router.get(
  "/cart/:sessionId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const result = await handleShowCart(sessionId);
      res.status(200).json(result);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

/**
 * Clear cart
 */
router.delete(
  "/cart/:sessionId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      await AICart.deleteMany({ sessionId });
      res.status(200).json({
        success: true,
        message: "Cart cleared successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;