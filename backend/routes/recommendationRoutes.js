/**
 * Recommendation Routes
 * 
 * API endpoints for the product recommendation system.
 */

const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const {
  getPersonalizedRecommendations,
  getRecommendationsForUser,
  getQuickRecommendations,
} = require("../controller/recommendation");

/**
 * @route   GET /api/v2/recommendations
 * @desc    Get personalized recommendations for the authenticated user
 * @access  Private
 */
router.get("/", isAuthenticated, getPersonalizedRecommendations);

/**
 * @route   GET /api/v2/recommendations/quick
 * @desc    Get quick recommendations without metadata (lightweight)
 * @access  Private
 */
router.get("/quick", isAuthenticated, getQuickRecommendations);

/**
 * @route   GET /api/v2/recommendations/:userId
 * @desc    Get recommendations for a specific user (admin/system use)
 * @access  Private
 */
router.get("/:userId", isAuthenticated, getRecommendationsForUser);

module.exports = router;