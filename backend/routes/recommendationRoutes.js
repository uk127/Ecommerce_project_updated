/**
 * Recommendation Routes
 * 
 * API endpoints for the product recommendation system.
 * 
 * Available Endpoints:
 * - GET /home - Home screen recommendations with ADD scoring (20 items default)
 * - GET / - Standard personalized recommendations (10 items)
 * - GET /quick - Quick recommendations without metadata
 * - GET /trending - Trending products (public, no auth required)
 * - GET /:userId - Recommendations for specific user (admin use)
 */

const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const {
  getHomeScreenRecommendations,
  getPersonalizedRecommendations,
  getRecommendationsForUser,
  getQuickRecommendations,
  getTrendingProductsList,
} = require("../controller/recommendation");

/**
 * @route   GET /api/v2/recommendations/home
 * @desc    Get personalized home screen recommendations using ADD scoring
 *          Uses weights: click=3, order=4
 *          Distributes products proportionally based on category scores
 * @query   {number} count - Number of recommendations (default: 20, max: 50)
 * @access  Private (requires authentication)
 * 
 * @example
 * GET /api/v2/recommendations/home
 * GET /api/v2/recommendations/home?count=30
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Personalized recommendations based on your activity!",
 *   "isPersonalized": true,
 *   "recommendations": [...],
 *   "count": 20,
 *   "metadata": {
 *     "categoryScores": { "Electronics": 15, "Clothing": 8 },
 *     "distribution": { "Electronics": 12, "Clothing": 8 },
 *     "weights": { "CLICK": 3, "ORDER": 4 }
 *   }
 * }
 */
router.get("/home", isAuthenticated, getHomeScreenRecommendations);

/**
 * @route   GET /api/v2/recommendations/trending
 * @desc    Get trending/popular products (public endpoint)
 *          Used for guest users or as fallback
 * @query   {number} count - Number of products (default: 20, max: 50)
 * @access  Public
 */
router.get("/trending", getTrendingProductsList);

/**
 * @route   GET /api/v2/recommendations/quick
 * @desc    Get quick recommendations without metadata (lightweight)
 * @access  Private
 */
router.get("/quick", isAuthenticated, getQuickRecommendations);

/**
 * @route   GET /api/v2/recommendations
 * @desc    Get personalized recommendations for the authenticated user
 * @access  Private
 */
router.get("/", isAuthenticated, getPersonalizedRecommendations);

/**
 * @route   GET /api/v2/recommendations/:userId
 * @desc    Get recommendations for a specific user (admin/system use)
 * @access  Private
 */
router.get("/:userId", isAuthenticated, getRecommendationsForUser);

module.exports = router;