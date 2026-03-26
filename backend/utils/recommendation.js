/**
 * Content-Based Product Recommendation System
 * 
 * This module provides personalized product recommendations based on user behavior.
 * It analyzes user's clicked and purchased products to determine preferences
 * and recommends similar products from preferred productTypes and categories using ADD scoring.
 * 
 * SCORING ALGORITHM:
 * - Click weight: 3
 * - Order weight: 4
 * - Score(productType) = (click_count × 3) + (order_count × 4)
 * 
 * RECOMMENDATION PRIORITY:
 * 1. Products from top-scored productType (all available)
 * 2. Popular items from other productTypes in same category
 * 3. Trending products from all categories
 * 
 * Features:
 * - productType prioritization for more relevant recommendations
 * - Excludes already interacted products
 * - Shuffles results for diversity
 * - Fallback to trending products for new users
 */

const UserActivity = require("../model/userActivity");
const Product = require("../model/product");
const Order = require("../model/order");

// =====================================================
// CONFIGURATION CONSTANTS
// =====================================================

/**
 * Weights for different interaction types
 * Higher weight = stronger preference signal
 */
const WEIGHTS = {
  CLICK: 3,    // User showed interest by clicking
  ORDER: 4,    // User made a purchase (strongest signal)
};

/**
 * Default number of recommendations to return
 */
const DEFAULT_RECOMMENDATION_COUNT = 20;

/**
 * Minimum stock required for a product to be recommended
 */
const MIN_STOCK_THRESHOLD = 0;

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Shuffle an array using Fisher-Yates algorithm
 * Provides randomized order for diverse recommendations
 * 
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array (new array, original not modified)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get trending/popular products as fallback
 * Used when user has no activity or for filling gaps
 * 
 * @param {number} limit - Maximum number of products to return
 * @param {Array} excludeIds - Product IDs to exclude
 * @returns {Promise<Array>} - Array of trending products
 */
async function getTrendingProducts(limit, excludeIds = []) {
  const query = {
    _id: { $nin: excludeIds },
    stock: { $gt: MIN_STOCK_THRESHOLD }
  };

  return await Product.find(query)
    .sort({ sold_out: -1, ratings: -1 })
    .limit(limit)
    .populate("shopId", "name");
}

/**
 * Get popular products from a specific category (excluding certain productTypes)
 * 
 * @param {string} category - Category to search in
 * @param {Array} excludeProductTypes - ProductTypes to exclude
 * @param {number} limit - Maximum products to return
 * @param {Array} excludeIds - Product IDs to exclude
 * @returns {Promise<Array>} - Array of products
 */
async function getPopularFromCategory(category, excludeProductTypes = [], limit, excludeIds = []) {
  const query = {
    category: category,
    _id: { $nin: excludeIds },
    stock: { $gt: MIN_STOCK_THRESHOLD }
  };

  // Exclude specific productTypes if provided
  if (excludeProductTypes.length > 0) {
    query.productType = { $nin: excludeProductTypes };
  }

  return await Product.find(query)
    .sort({ sold_out: -1, ratings: -1 })
    .limit(limit)
    .populate("shopId", "name");
}

// =====================================================
// MAIN RECOMMENDATION FUNCTIONS
// =====================================================

/**
 * Get personalized home screen recommendations for a user
 * 
 * PRIORITY LOGIC:
 * 1. Fetch all products from top-scored productType (excluding interacted)
 * 2. Fill remaining slots with popular items from same category (other productTypes)
 * 3. Fill any remaining slots with trending products from all categories
 * 
 * SCORING:
 * - Click weight: 3
 * - Order weight: 4
 * - Score(productType) = (clicks × 3) + (orders × 4)
 * 
 * @param {string} userId - The user's ID
 * @param {number} totalItems - Total recommendations to return (default: 20)
 * @returns {Promise<Object>} - Object with recommendations and metadata
 */
async function getHomeRecommendations(userId, totalItems = DEFAULT_RECOMMENDATION_COUNT) {
  try {
    console.log("===== getHomeRecommendations called =====");
    console.log("User ID:", userId.toString());
    console.log("Requested items:", totalItems);

    // =====================================================
    // STEP 1: Initialize tracking variables
    // =====================================================
    
    // Set to store all product IDs the user has interacted with (for exclusion)
    const interactedProductIds = new Set();
    
    // Object to store category scores using ADD method
    const categoryScores = {};
    
    // Object to store productType scores using ADD method
    const productTypeScores = {};
    
    // Map to store productType -> category relationship
    const productTypeCategoryMap = {};

    // Counters for analytics
    let clickCount = 0;
    let orderCount = 0;

    // =====================================================
    // STEP 2: Fetch clicked products from UserActivity
    // =====================================================
    
    const userActivity = await UserActivity.findOne({ user_id: userId });
    
    console.log("UserActivity found:", userActivity ? "Yes" : "No");
    
    if (userActivity && userActivity.clicked_products && userActivity.clicked_products.length > 0) {
      console.log("Clicked products count:", userActivity.clicked_products.length);
      
      // Process each clicked product
      for (const item of userActivity.clicked_products) {
        if (item.product_id) {
          const productIdStr = item.product_id.toString();
          interactedProductIds.add(productIdStr);
          clickCount++;
        }
      }
    }

    // =====================================================
    // STEP 3: Fetch ordered products from Orders collection
    // =====================================================
    
    const userOrders = await Order.find({ "user._id": userId.toString() });
    
    console.log("Orders found for user:", userOrders?.length || 0);
    
    if (userOrders && userOrders.length > 0) {
      for (const order of userOrders) {
        if (order.cart && Array.isArray(order.cart)) {
          for (const cartItem of order.cart) {
            // cartItem contains productId and quantity
            if (cartItem.productId || cartItem._id) {
              const productId = cartItem.productId || cartItem._id;
              const productIdStr = productId.toString();
              interactedProductIds.add(productIdStr);
              orderCount++;
            }
          }
        }
      }
    }

    console.log("Total interacted products:", interactedProductIds.size);
    console.log("Click interactions:", clickCount);
    console.log("Order interactions:", orderCount);

    // =====================================================
    // STEP 4: If no activity, return trending products
    // =====================================================
    
    if (interactedProductIds.size === 0) {
      console.log("No user activity found, returning trending products");
      
      const trendingProducts = await getTrendingProducts(totalItems);
      
      return {
        success: true,
        recommendations: trendingProducts,
        metadata: {
          totalRecommendations: trendingProducts.length,
          isPersonalized: false,
          message: "Trending products for you! Browse and shop to get personalized recommendations.",
          userInteractions: {
            clicks: clickCount,
            orders: orderCount
          },
          categoryScores: {},
          productTypeScores: {},
          distribution: {},
          topProductType: null,
          topCategory: null
        }
      };
    }

    // =====================================================
    // STEP 5: Fetch category/productType for interacted products
    // =====================================================
    
    const interactedProductsArray = Array.from(interactedProductIds);
    
    const interactedProductDetails = await Product.find({
      _id: { $in: interactedProductsArray }
    }).select("category productType");

    console.log("Fetched details for", interactedProductDetails.length, "interacted products");

    // =====================================================
    // STEP 6: Calculate category and productType preferences
    // Using ADD (Additive Aggregation) scoring method
    // =====================================================
    
    // Create a map for quick lookup
    const productDetailsMap = new Map();
    interactedProductDetails.forEach(p => {
      productDetailsMap.set(p._id.toString(), p);
    });

    // Count clicks per category/productType
    if (userActivity && userActivity.clicked_products) {
      for (const item of userActivity.clicked_products) {
        if (item.product_id) {
          const productDetail = productDetailsMap.get(item.product_id.toString());
          if (productDetail) {
            // Add click weight to category score
            if (productDetail.category) {
              categoryScores[productDetail.category] = 
                (categoryScores[productDetail.category] || 0) + WEIGHTS.CLICK;
            }
            // Add click weight to productType score
            if (productDetail.productType) {
              productTypeScores[productDetail.productType] = 
                (productTypeScores[productDetail.productType] || 0) + WEIGHTS.CLICK;
              
              // Store productType -> category relationship
              if (productDetail.category) {
                productTypeCategoryMap[productDetail.productType] = productDetail.category;
              }
            }
          }
        }
      }
    }

    // Count orders per category/productType
    if (userOrders && userOrders.length > 0) {
      for (const order of userOrders) {
        if (order.cart && Array.isArray(order.cart)) {
          for (const cartItem of order.cart) {
            const productId = cartItem.productId || cartItem._id;
            if (productId) {
              const productDetail = productDetailsMap.get(productId.toString());
              if (productDetail) {
                // Add order weight to category score
                if (productDetail.category) {
                  categoryScores[productDetail.category] = 
                    (categoryScores[productDetail.category] || 0) + WEIGHTS.ORDER;
                }
                // Add order weight to productType score
                if (productDetail.productType) {
                  productTypeScores[productDetail.productType] = 
                    (productTypeScores[productDetail.productType] || 0) + WEIGHTS.ORDER;
                  
                  // Store productType -> category relationship
                  if (productDetail.category) {
                    productTypeCategoryMap[productDetail.productType] = productDetail.category;
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log("Category scores (ADD method):", categoryScores);
    console.log("ProductType scores (ADD method):", productTypeScores);
    console.log("ProductType-Category mapping:", productTypeCategoryMap);

    // =====================================================
    // STEP 7: Determine top productType and its category
    // =====================================================
    
    // Sort productTypes by score (descending)
    const sortedProductTypes = Object.entries(productTypeScores)
      .sort((a, b) => b[1] - a[1]);

    // Sort categories by score (descending)
    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1]);

    console.log("Sorted productTypes by preference:", sortedProductTypes);
    console.log("Sorted categories by preference:", sortedCategories);

    // Get top productType and its category
    let topProductType = null;
    let topProductTypeScore = 0;
    let topCategory = null;

    if (sortedProductTypes.length > 0) {
      topProductType = sortedProductTypes[0][0];
      topProductTypeScore = sortedProductTypes[0][1];
      topCategory = productTypeCategoryMap[topProductType];
    }

    console.log("Top productType:", topProductType, "Score:", topProductTypeScore);
    console.log("Top category:", topCategory);

    // =====================================================
    // STEP 8: Fetch products with PROPORTIONAL PRODUCTTYPE ALLOCATION
    // =====================================================
    
    let recommendations = [];
    const usedProductIds = new Set(interactedProductIds);
    let remainingItems = totalItems;

    // Track distribution for metadata - per productType
    const distribution = {
      productTypes: {},  // Count per productType
      sameCategoryOtherTypes: 0,
      trending: 0
    };

    // -----------------------------------------------------
    // PRIORITY 1: Proportional allocation across all productTypes
    // -----------------------------------------------------
    if (sortedProductTypes.length > 0) {
      console.log("\n--- PRIORITY 1: Proportional productType allocation ---");
      
      // Calculate total score across all productTypes
      const totalScore = sortedProductTypes.reduce((sum, [_, score]) => sum + score, 0);
      console.log(`Total productType score: ${totalScore}`);
      
      // Calculate slot allocation for each productType
      const productTypeAllocations = [];
      let allocatedSlots = 0;
      
      for (let i = 0; i < sortedProductTypes.length; i++) {
        const [productType, score] = sortedProductTypes[i];
        
        let slotCount;
        if (i === sortedProductTypes.length - 1) {
          // Last productType gets remaining slots to avoid rounding issues
          slotCount = totalItems - allocatedSlots;
        } else {
          // Proportional allocation: (score / totalScore) * totalRecommendations
          slotCount = Math.round((score / totalScore) * totalItems);
          // Ensure at least 1 product per type if score > 0
          slotCount = Math.max(1, slotCount);
        }
        
        productTypeAllocations.push({ productType, score, slotCount });
        allocatedSlots += slotCount;
        
        console.log(`  ${productType}: score=${score}, allocated slots=${slotCount}`);
      }
      
      // Fetch products for each productType based on allocation
      for (const { productType, slotCount } of productTypeAllocations) {
        if (remainingItems <= 0) break;
        
        // Cap at remaining items
        const fetchCount = Math.min(slotCount, remainingItems);
        
        console.log(`\n  Fetching ${fetchCount} products from productType "${productType}"`);
        
        const productTypeProducts = await Product.find({
          productType: productType,
          _id: { $nin: Array.from(usedProductIds) },
          stock: { $gt: MIN_STOCK_THRESHOLD }
        })
          .sort({ sold_out: -1, ratings: -1 })
          .limit(fetchCount)
          .populate("shopId", "name");

        console.log(`  Found ${productTypeProducts.length} products in productType "${productType}"`);

        // Add fetched products to recommendations
        for (const product of productTypeProducts) {
          recommendations.push(product);
          usedProductIds.add(product._id.toString());
          remainingItems--;
          
          // Track per productType
          distribution.productTypes[productType] = (distribution.productTypes[productType] || 0) + 1;
        }
      }

      console.log(`\nAfter productType allocation: ${recommendations.length} products, ${remainingItems} slots remaining`);
    }

    // -----------------------------------------------------
    // PRIORITY 2: Fill with popular items from same category (other productTypes)
    // -----------------------------------------------------
    if (remainingItems > 0 && topCategory) {
      console.log(`\n--- PRIORITY 2: Fetching products from same category "${topCategory}" (other productTypes) ---`);
      
      // Get all productTypes already fetched to exclude them
      const fetchedProductTypes = Object.keys(distribution.productTypes);
      
      const sameCategoryProducts = await getPopularFromCategory(
        topCategory,
        fetchedProductTypes, // Exclude already fetched productTypes
        remainingItems,
        Array.from(usedProductIds)
      );

      console.log(`Found ${sameCategoryProducts.length} products from same category (other productTypes)`);

      for (const product of sameCategoryProducts) {
        recommendations.push(product);
        usedProductIds.add(product._id.toString());
        remainingItems--;
        distribution.sameCategoryOtherTypes++;
      }

      console.log(`Added ${sameCategoryProducts.length} products from same category. Remaining slots: ${remainingItems}`);
    }

    // -----------------------------------------------------
    // PRIORITY 3: Fill remaining with trending products from all categories
    // -----------------------------------------------------
    if (remainingItems > 0) {
      console.log(`\n--- PRIORITY 3: Filling ${remainingItems} remaining slots with trending products ---`);
      
      const trendingProducts = await getTrendingProducts(
        remainingItems,
        Array.from(usedProductIds)
      );

      for (const product of trendingProducts) {
        recommendations.push(product);
        usedProductIds.add(product._id.toString());
        remainingItems--;
        distribution.trending++;
      }

      console.log(`Added ${trendingProducts.length} trending products`);
    }

    // =====================================================
    // STEP 9: Shuffle recommendations for diversity
    // =====================================================
    
    console.log("\n--- Shuffling recommendations for diversity ---");
    const shuffledRecommendations = shuffleArray(recommendations);

    console.log("Final recommendations count:", shuffledRecommendations.length);
    console.log("Distribution:", distribution);
    console.log("===== getHomeRecommendations complete =====");

    // =====================================================
    // STEP 10: Return results with metadata
    // =====================================================
    
    return {
      success: true,
      recommendations: shuffledRecommendations,
      metadata: {
        totalRecommendations: shuffledRecommendations.length,
        isPersonalized: true,
        message: "Personalized recommendations based on your activity!",
        userInteractions: {
          clicks: clickCount,
          orders: orderCount
        },
        categoryScores: categoryScores,
        productTypeScores: productTypeScores,
        distribution: distribution,
        topProductType: topProductType,
        topProductTypeScore: topProductTypeScore,
        topCategory: topCategory,
        weights: WEIGHTS
      }
    };

  } catch (error) {
    console.error("Error in getHomeRecommendations:", error.message);
    console.error(error.stack);
    
    // Return empty array on error (graceful degradation)
    return {
      success: false,
      recommendations: [],
      error: error.message,
      metadata: {
        totalRecommendations: 0,
        isPersonalized: false,
        message: "Unable to load recommendations. Please try again later."
      }
    };
  }
}

/**
 * Get personalized product recommendations for a user (legacy function)
 * Kept for backward compatibility
 * 
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} - Array of recommended products (max 10)
 */
async function getRecommendations(userId) {
  try {
    console.log("===== getRecommendations called =====");
    console.log("User ID:", userId.toString());
    
    // Initialize a Set to store all interacted product IDs (Set prevents duplicates)
    const interactedProductIds = new Set();
    
    // Initialize an object to count category preferences
    const categoryPreferences = {};

    // -----------------------------------------------------
    // 1.1: Get products from UserActivity (viewed and clicked)
    // -----------------------------------------------------
    
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
    const userOrders = await Order.find({ "user._id": userId.toString() });
    
    console.log("Orders found for user:", userOrders?.length || 0);

    if (userOrders && userOrders.length > 0) {
      userOrders.forEach((order) => {
        if (order.cart && Array.isArray(order.cart)) {
          order.cart.forEach((cartItem) => {
            if (cartItem._id) {
              interactedProductIds.add(cartItem._id.toString());
              console.log("Added purchased product:", cartItem._id.toString(), cartItem.name);
            }
          });
        }
      });
    }

    // =====================================================
    // STEP 2: Determine category preferences from interacted products
    // =====================================================
    
    if (interactedProductIds.size > 0) {
      const productIdsArray = Array.from(interactedProductIds);
      
      const interactedProducts = await Product.find({
        _id: { $in: productIdsArray }
      }).select("category");

      interactedProducts.forEach((product) => {
        if (product.category) {
          categoryPreferences[product.category] = (categoryPreferences[product.category] || 0) + 1;
        }
      });
    }

    // =====================================================
    // STEP 3: Sort categories by preference (most interacted first)
    // =====================================================
    
    const sortedCategories = Object.entries(categoryPreferences)
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);

    // =====================================================
    // STEP 4: Build the recommendation query
    // =====================================================
    
    const excludeProductIds = Array.from(interactedProductIds);
    
    const query = {
      _id: { $nin: excludeProductIds }
    };

    // =====================================================
    // STEP 5: Fetch recommended products
    // =====================================================
    
    let recommendedProducts = [];
    
    if (sortedCategories.length > 0) {
      const categoryQuery = {
        ...query,
        category: { $in: sortedCategories }
      };

      recommendedProducts = await Product.find(categoryQuery)
        .sort({ sold_out: -1, ratings: -1 })
        .limit(10);
    } else {
      recommendedProducts = await Product.find()
        .sort({ sold_out: -1, ratings: -1 })
        .limit(10);
      
      return recommendedProducts;
    }

    // =====================================================
    // STEP 6: Handle edge cases - fill with general recommendations if needed
    // =====================================================
    
    if (recommendedProducts.length < 10) {
      const existingIds = recommendedProducts.map((p) => p._id.toString());
      const additionalQuery = {
        ...query,
        _id: { 
          $nin: [...excludeProductIds, ...existingIds] 
        }
      };

      const additionalProducts = await Product.find(additionalQuery)
        .sort({ sold_out: -1, ratings: -1 })
        .limit(10 - recommendedProducts.length)
        .populate("shopId", "name");

      recommendedProducts = [...recommendedProducts, ...additionalProducts];
    }

    return recommendedProducts;

  } catch (error) {
    console.error("Error generating recommendations:", error.message);
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
    // Use the new home recommendations function
    const result = await getHomeRecommendations(userId, 10);

    // Gather metadata for analytics
    const userActivity = await UserActivity.findOne({ user_id: userId });
    const orderCount = await Order.countDocuments({ "user._id": userId });

    // Calculate interaction counts
    const viewCount = userActivity?.viewed_products?.length || 0;
    const clickCount = userActivity?.clicked_products?.length || 0;
    const searchCount = userActivity?.search_history?.length || 0;

    return {
      success: true,
      recommendations: result.recommendations,
      metadata: {
        totalRecommendations: result.recommendations.length,
        userInteractions: {
          views: viewCount,
          clicks: clickCount,
          searches: searchCount,
          purchases: orderCount
        },
        ...result.metadata
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

// =====================================================
// MODULE EXPORTS
// =====================================================

module.exports = {
  getRecommendations,
  getRecommendationsWithMetadata,
  getHomeRecommendations,
  getTrendingProducts,
  // Export constants for testing/external use
  WEIGHTS,
  DEFAULT_RECOMMENDATION_COUNT
};