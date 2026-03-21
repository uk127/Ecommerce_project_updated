/**
 * Recommendation Controller
 * 
 * Handles API endpoints for the product recommendation system.
 */

const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { getRecommendations, getRecommendationsWithMetadata } = require("../utils/recommendation");

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