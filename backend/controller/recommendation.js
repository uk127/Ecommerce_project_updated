/**
 * Recommendation Controller
 * 
 * Handles API endpoints for the product recommendation system.
 * Provides personalized recommendations based on user activity using ADD scoring.
 */
const { refineForUser } = require('../utils/refineRecommendations'); // import at top
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { 
  getRecommendations, 
  getRecommendationsWithMetadata,
  getHomeRecommendations,
  getTrendingProducts,
  WEIGHTS,
  DEFAULT_RECOMMENDATION_COUNT
} = require("../utils/recommendation");

/**
 * Get personalized home screen recommendations
 * 
 * This is the main endpoint for the home page recommendation section.
 * Uses ADD (Additive Aggregation) scoring:
 * - Click weight: 3
 * - Order weight: 4
 * - Score(category) = (click_count × 3) + (order_count × 4)
 * 
 * Returns up to 20 (or specified count) products distributed proportionally
 * across user's preferred categories.
 * 
 * @route GET /api/v2/recommendations/home
 * @query {number} count - Number of recommendations (default: 20)
 * @access Private (requires authentication)
 */
exports.getHomeScreenRecommendations = catchAsyncErrors(async (req, res, next) => {
  // Get the user ID from the authenticated request
  const userId = req.user._id;
  
  // Get requested count from query params (default: 20)
  const count = parseInt(req.query.count) || DEFAULT_RECOMMENDATION_COUNT;
  
  // Cap at reasonable maximum
  const maxCount = Math.min(count, 50);
  
  console.log("Getting home recommendations for user:", userId.toString());
  console.log("Requested count:", maxCount);

  // Get recommendations using the ADD scoring algorithm
  const result = await getHomeRecommendations(userId, maxCount);
  const refinedRecommendations = await refineForUser(result.recommendations, userId);

  console.log("result.recommendations->",result.recommendations);
  console.log("refinedRecommendations------",refinedRecommendations);

  console.log("Recommendations found:", result.recommendations?.length || 0);
  console.log("Is personalized:", result.metadata?.isPersonalized);

  // Send the response
  res.status(200).json({
    success: true,
    message: result.metadata?.message || "Recommendations loaded successfully",
    isPersonalized: result.metadata?.isPersonalized || false,
    //change to result.recommendations if you don't need clustering
    recommendations: refinedRecommendations,
    count: result.recommendations?.length || 0,
    metadata: {
      ...result.metadata,
      weights: WEIGHTS
    }
  });
});

/**
 * Get personalized product recommendations for the authenticated user
 * 
 * @route GET /api/v2/recommendations
 * @access Private (requires authentication)
 */
exports.getPersonalizedRecommendations = catchAsyncErrors(async (req, res, next) => {
  // Get the user ID from the authenticated request
  const userId = req.user._id;
  
  // Log for debugging
  console.log("Getting recommendations for user:", userId.toString());
  console.log("User email:", req.user.email);

  // Get recommendations with metadata
  const result = await getRecommendationsWithMetadata(userId);
  
  // Log result count
  console.log("Recommendations found:", result.recommendations?.length || 0);
  console.log("User interactions:", result.metadata?.userInteractions);

  // Determine if these are personalized or generic popular products
  const hasUserActivity = result.metadata?.userInteractions?.views > 0 || 
                          result.metadata?.userInteractions?.clicks > 0 ||
                          result.metadata?.userInteractions?.purchases > 0;

  // Send the response
  res.status(200).json({
    success: true,
    message: hasUserActivity 
      ? "Personalized recommendations based on your browsing history!" 
      : "Popular products for you! Browse more products to get personalized suggestions.",
    isPersonalized: hasUserActivity,
    recommendations: result.recommendations,
    metadata: result.metadata
  });
});

/**
 * Get recommendations for a specific user (admin/system use)
 * 
 * @route GET /api/v2/recommendations/:userId
 * @access Private (requires authentication)
 */
exports.getRecommendationsForUser = catchAsyncErrors(async (req, res, next) => {
  const { userId } = req.params;

  // Validate userId
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required"
    });
  }

  // Get recommendations with metadata
  const result = await getRecommendationsWithMetadata(userId);

  // Send the response
  res.status(200).json({
    success: true,
    recommendations: result.recommendations,
    metadata: result.metadata
  });
});

/**
 * Get quick recommendations (lightweight, just the products)
 * 
 * @route GET /api/v2/recommendations/quick
 * @access Private (requires authentication)
 */
exports.getQuickRecommendations = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  // Get just the recommendations without metadata
  const recommendations = await getRecommendations(userId);

  res.status(200).json({
    success: true,
    count: recommendations.length,
    recommendations
  });
});

/**
 * Get trending products (public, no authentication required)
 * Used for guest users or fallback scenarios
 * 
 * @route GET /api/v2/recommendations/trending
 * @access Public
 */
exports.getTrendingProductsList = catchAsyncErrors(async (req, res, next) => {
  // Get count from query params (default: 20)
  const count = parseInt(req.query.count) || 20;
  const maxCount = Math.min(count, 50);

  const trendingProducts = await getTrendingProducts(maxCount);

  res.status(200).json({
    success: true,
    message: "Trending products",
    count: trendingProducts.length,
    recommendations: trendingProducts
  });
});