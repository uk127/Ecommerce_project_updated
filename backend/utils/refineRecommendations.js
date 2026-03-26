/**
 * Recommendation Refinement Module
 * 
 * This module refines product recommendations based on user segments.
 * Different segments have different sorting strategies:
 * - Premium: Higher price + higher ratings first (combined score)
 * - Budget: Cheapest products first (price ascending)
 * - Regular: No change (original order preserved)
 * 
 * Usage:
 *   const { refineRecommendations } = require('./utils/refineRecommendations');
 *   const refined = refineRecommendations(products, 'premium');
 */

/**
 * Calculate combined score for premium users
 * Score = (normalized price * weight) + (normalized rating * weight)
 * 
 * Higher score = better rank for premium users
 * 
 * @param {Object} product - Product object with price and ratings
 * @param {Object} options - Scoring options
 * @returns {Number} Combined score
 */
const calculatePremiumScore = (product, options = {}) => {
  const {
    priceWeight = 0.5,    // Weight for price component
    ratingWeight = 0.5,  // Weight for rating component
    maxPrice = 10000,    // Max price for normalization (adjust based on your data)
    maxRating = 5        // Max rating (usually 5)
  } = options;

  const price = product.price || product.discountPrice || 0;
  const rating = product.ratings || 0;

  // Normalize price (0 to 1) - higher price = higher normalized value
  const normalizedPrice = Math.min(price / maxPrice, 1);
  
  // Normalize rating (0 to 1) - already on 0-5 scale
  const normalizedRating = rating / maxRating;

  // Combined score: weighted sum
  // For premium users, higher price is considered better (indicates quality)
  const score = (normalizedPrice * priceWeight) + (normalizedRating * ratingWeight);

  return score;
};

/**
 * Sort products for premium users
 * Higher combined score (price + rating) first
 * 
 * @param {Array} products - Array of product objects
 * @param {Object} options - Sorting options
 * @returns {Array} Sorted products
 */
const sortForPremium = (products, options = {}) => {
  return [...products].sort((a, b) => {
    const scoreA = calculatePremiumScore(a, options);
    const scoreB = calculatePremiumScore(b, options);
    
    // Sort by score descending (higher score first)
    return scoreB - scoreA;
  });
};

/**
 * Sort products for budget users
 * Cheapest products first (price ascending)
 * 
 * @param {Array} products - Array of product objects
 * @returns {Array} Sorted products
 */
const sortForBudget = (products) => {
  return [...products].sort((a, b) => {
    const priceA = a.price || a.discountPrice || 0;
    const priceB = b.price || b.discountPrice || 0;
    
    // Sort by price ascending (cheapest first)
    return priceA - priceB;
  });
};

/**
 * Refine recommendations based on user segment
 * 
 * @param {Array} products - Array of product recommendations
 * @param {String} segment - User segment ('premium', 'budget', or 'regular')
 * @param {Object} options - Optional sorting options for premium users
 * @returns {Array} Refined array of products
 * 
 * @example
 * // Premium users - sorted by combined score
 * const refined = refineRecommendations(products, 'premium');
 * 
 * @example
 * // Budget users - cheapest first
 * const refined = refineRecommendations(products, 'budget');
 * 
 * @example
 * // Regular users - unchanged
 * const refined = refineRecommendations(products, 'regular');
 * 
 * @example
 * // Premium with custom weights
 * const refined = refineRecommendations(products, 'premium', {
 *   priceWeight: 0.7,
 *   ratingWeight: 0.3,
 *   maxPrice: 50000
 * });
 */
const refineRecommendations = (products, segment, options = {}) => {
  // Validate inputs
  if (!Array.isArray(products)) {
    console.warn('[RefineRecommendations] Invalid products array, returning empty array');
    return [];
  }

  if (products.length === 0) {
    return products;
  }

  // Validate segment
  const validSegments = ['premium', 'budget', 'regular'];
  const normalizedSegment = segment?.toLowerCase() || 'regular';

  if (!validSegments.includes(normalizedSegment)) {
    console.warn(`[RefineRecommendations] Invalid segment "${segment}", using "regular"`);
    return products;
  }

  console.log(`[RefineRecommendations] Refining ${products.length} products for ${normalizedSegment} user`);

  switch (normalizedSegment) {
    case 'premium':
      // Higher price + higher ratings first
      return sortForPremium(products, options);
    
    case 'budget':
      // Cheapest first
      return sortForBudget(products);
    
    case 'regular':
    default:
      // No change - return original order
      return products;
  }
};

/**
 * Get user segment from UserCluster collection
 * Convenience function to fetch segment for a user
 * 
 * @param {String} userId - User ID
 * @returns {Promise<String>} User segment or 'regular' as default
 */
const getUserSegment = async (userId) => {
  try {
    const UserCluster = require('../model/userCluster');
    const userCluster = await UserCluster.findOne({ userId }).lean();
    
    if (!userCluster) {
      console.log(`[RefineRecommendations] No segment found for user ${userId}, using 'regular'`);
      return 'regular';
    }
    
    return userCluster.segment || 'regular';
  } catch (error) {
    console.error(`[RefineRecommendations] Error fetching user segment: ${error.message}`);
    return 'regular';
  }
};

/**
 * Refine recommendations with automatic segment lookup
 * Convenience function that fetches the user's segment automatically
 * 
 * @param {Array} products - Array of product recommendations
 * @param {String} userId - User ID to look up segment
 * @param {Object} options - Optional sorting options
 * @returns {Promise<Array>} Refined array of products
 */
const refineForUser = async (products, userId, options = {}) => {
  const segment = await getUserSegment(userId);
  return refineRecommendations(products, segment, options);
};

// Export all functions
module.exports = {
  refineRecommendations,
  refineForUser,
  getUserSegment,
  calculatePremiumScore,
  sortForPremium,
  sortForBudget
};

/**
 * ========================================
 * EXAMPLE USAGE
 * ========================================
 * 
 * // In your recommendation controller:
 * 
 * const { refineRecommendations, getUserSegment } = require('../utils/refineRecommendations');
 * const { getHomeRecommendations } = require('../utils/recommendation');
 * 
 * // Method 1: Manual segment passing
 * exports.getRecommendations = async (req, res) => {
 *   const userId = req.user._id;
 *   
 *   // Get base recommendations
 *   const recommendations = await getHomeRecommendations(userId);
 *   
 *   // Get user segment
 *   const segment = await getUserSegment(userId);
 *   
 *   // Refine based on segment
 *   const refined = refineRecommendations(recommendations, segment);
 *   
 *   res.json({ success: true, recommendations: refined });
 * };
 * 
 * // Method 2: Automatic segment lookup
 * const { refineForUser } = require('../utils/refineRecommendations');
 * 
 * exports.getRecommendations = async (req, res) => {
 *   const userId = req.user._id;
 *   
 *   // Get base recommendations
 *   const recommendations = await getHomeRecommendations(userId);
 *   
 *   // Refine with automatic segment lookup
 *   const refined = await refineForUser(recommendations, userId);
 *   
 *   res.json({ success: true, recommendations: refined });
 * };
 * 
 * // Method 3: With custom options for premium users
 * const refined = refineRecommendations(products, 'premium', {
 *   priceWeight: 0.6,      // Price is 60% of score
 *   ratingWeight: 0.4,     // Rating is 40% of score
 *   maxPrice: 100000       // Normalize against max price of 100,000
 * });
 */