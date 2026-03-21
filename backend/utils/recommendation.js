/**
 * Content-Based Product Recommendation System
 * 
 * This module provides personalized product recommendations based on user behavior.
 * It analyzes user's viewed, clicked, and purchased products to determine preferences
 * and recommends similar products from preferred categories.
 */

const UserActivity = require("../model/userActivity");
const Product = require("../model/product");
const Order = require("../model/order");

/**
 * Get personalized product recommendations for a user
 * 
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} - Array of recommended products (max 10)
 */
async function getRecommendations(userId) {
  try {
    // Log for debugging
    console.log("===== getRecommendations called =====");
    console.log("User ID:", userId.toString());
    
    // =====================================================
    // STEP 1: Gather all products the user has interacted with
    // =====================================================
    
    // Initialize a Set to store all interacted product IDs (Set prevents duplicates)
    const interactedProductIds = new Set();
    
    // Initialize an object to count category preferences
    const categoryPreferences = {};

    // -----------------------------------------------------
    // 1.1: Get products from UserActivity (viewed and clicked)
    // -----------------------------------------------------
    
    // getting the user id from user activity collection
    const userActivity = await UserActivity.findOne({ user_id: userId });
    
    console.log("UserActivity found:", userActivity ? "Yes" : "No");
    if (userActivity) {
      console.log("Viewed products count:", userActivity.viewed_products?.length || 0);
      console.log("Clicked products count:", userActivity.clicked_products?.length || 0);
    }

    if (userActivity) {
      // Extract product IDs from viewed_products array
      if (userActivity.viewed_products && userActivity.viewed_products.length > 0) {
        userActivity.viewed_products.forEach((item) => {
          if (item.product_id) {
            interactedProductIds.add(item.product_id.toString());
          }
        });
      }

      // Extract product IDs from clicked_products array
      if (userActivity.clicked_products && userActivity.clicked_products.length > 0) {
        userActivity.clicked_products.forEach((item) => {
          if (item.product_id) {
            interactedProductIds.add(item.product_id.toString());
          }
        });
      }
    }

    // -----------------------------------------------------
    // 1.2: Get purchased products from Orders collection
    // -----------------------------------------------------
    // Query orders where user._id matches the userId (as string comparison)
    const userOrders = await Order.find({ "user._id": userId.toString() });
    
    console.log("Orders found for user:", userOrders?.length || 0);

    if (userOrders && userOrders.length > 0) {
      userOrders.forEach((order) => {
        // The cart contains an array of items with product information
        if (order.cart && Array.isArray(order.cart)) {
          order.cart.forEach((cartItem) => {
            // Check if the cart item has product information
            if (cartItem._id) {
              interactedProductIds.add(cartItem._id.toString());
              console.log("Added purchased product:", cartItem._id.toString(), cartItem.name);
            }
          });
        }
      });
    }
    console.log(userOrders);
    // =====================================================
    // STEP 2: Determine category preferences from interacted products
    // =====================================================
    
    if (interactedProductIds.size > 0) {
      // Convert Set to Array for the MongoDB query
      const productIdsArray = Array.from(interactedProductIds);
      
      // Fetch all interacted products to get their categories
      const interactedProducts = await Product.find({
        _id: { $in: productIdsArray }
      }).select("category");

      // Count how many times each category appears (this determines preference)
      interactedProducts.forEach((product) => {
        if (product.category) {
          // Increment the count for this category
          categoryPreferences[product.category] = (categoryPreferences[product.category] || 0) + 1;
        }
      });
    }

    // =====================================================
    // STEP 3: Sort categories by preference (most interacted first)
    // =====================================================
    
    const sortedCategories = Object.entries(categoryPreferences)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map((entry) => entry[0]); // Extract just the category name

    // =====================================================
    // STEP 4: Build the recommendation query
    // =====================================================
    
    // Convert interactedProductIds Set to an array of ObjectId strings
    console.log("interactedProductIds",interactedProductIds)
    const excludeProductIds = Array.from(interactedProductIds);
    
    // Base query: Exclude products the user has already interacted with
    const query = {
      _id: { $nin: excludeProductIds } // $nin = not in this array
    };
    // should be removed

    // =====================================================
    // STEP 5: Fetch recommended products
    // =====================================================
    
    let recommendedProducts = [];
    console.log("sorted category",sortedCategories);
    if (sortedCategories.length > 0) {
      // CASE A: User has category preferences
      // First, try to get products from preferred categories
      
      // Build category-based query
      const categoryQuery = {
        ...query,
        category: { $in: sortedCategories } // Products from preferred categories
      };

      recommendedProducts = await Product.find(categoryQuery)
        .sort({ sold_out: -1, ratings: -1 }) // Sort by popularity (sold count, then ratings)
        .limit(10);
    } else {
      // CASE B: User has no preferences yet - show popular products
      // This handles new users or users with no activity
      recommendedProducts = await Product.find()
        .sort({ sold_out: -1, ratings: -1 })
        .limit(10);
      
      // Return early since we already have 10 products
      return recommendedProducts;
    }
    console.log("recommended products",recommendedProducts);
    // =====================================================
    // STEP 6: Handle edge cases - fill with general recommendations if needed
    // =====================================================
    
    // If we don't have enough recommendations (or user has no preferences),
    // fill with popular products from any category
    if (recommendedProducts.length < 10) {
      // Get products not already in recommendations and not interacted
      const existingIds = recommendedProducts.map((p) => p._id.toString());
      const additionalQuery = {
        ...query,
        _id: { 
          $nin: [...excludeProductIds, ...existingIds] 
        }
      };

      const additionalProducts = await Product.find(additionalQuery)
        .sort({ sold_out: -1, ratings: -1 }) // Sort by popularity
        .limit(10 - recommendedProducts.length)
        .populate("shopId", "name");

      recommendedProducts = [...recommendedProducts, ...additionalProducts];
    }

    // =====================================================
    // STEP 7: Return the recommendations as JSON
    // =====================================================
    
    return recommendedProducts;

  } catch (error) {
    // Log error for debugging
    console.error("Error generating recommendations:", error.message);
    
    // Return empty array on error (graceful degradation)
    return [];
  }
}

/**
 * Get recommendations with category breakdown for analytics
 * 
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - Object with recommendations and metadata
 */
async function getRecommendationsWithMetadata(userId) {
  try {
    // Get basic recommendations
    const recommendations = await getRecommendations(userId);

    // Gather metadata for analytics
    const userActivity = await UserActivity.findOne({ user_id: userId });
    const orderCount = await Order.countDocuments({ "user._id": userId });

    // Calculate interaction counts
    const viewCount = userActivity?.viewed_products?.length || 0;
    const clickCount = userActivity?.clicked_products?.length || 0;
    const searchCount = userActivity?.search_history?.length || 0;

    return {
      success: true,
      recommendations,
      metadata: {
        totalRecommendations: recommendations.length,
        userInteractions: {
          views: viewCount,
          clicks: clickCount,
          searches: searchCount,
          purchases: orderCount
        }
      }
    };
  } catch (error) {
    console.error("Error getting recommendations with metadata:", error.message);
    return {
      success: false,
      recommendations: [],
      error: error.message
    };
  }
}

module.exports = {
  getRecommendations,
  getRecommendationsWithMetadata
};