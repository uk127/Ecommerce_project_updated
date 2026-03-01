const Product = require("../model/product");
const ErrorHandler = require("./ErrorHandler");

/**
 * Advanced product search function with text search and filtering
 * @param {string} query - Search query string
 * @param {Object} filters - Optional filters {category, minPrice, maxPrice}
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Array>} - Array of matching products
 */
const searchProducts = async (query, filters = {}, limit = 20) => {
  try {
    // Validate query
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return [];
    }

    // Build text search query
    const textSearchQuery = {
      $text: {
        $search: query,
        $caseSensitive: false,
        $diacriticSensitive: false
      }
    };

    // Build filter conditions
    const filterConditions = {};

    // Add category filter if provided
    if (filters.category) {
      filterConditions.category = filters.category;
    }

    // Add price range filters if provided
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      filterConditions.$or = [];

      // Handle discountPrice (priority)
      const discountPriceFilter = {};
      if (filters.minPrice !== undefined) {
        discountPriceFilter.$gte = Number(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        discountPriceFilter.$lte = Number(filters.maxPrice);
      }
      if (Object.keys(discountPriceFilter).length > 0) {
        filterConditions.$or.push({ discountPrice: discountPriceFilter });
      }

      // Handle originalPrice as fallback
      const originalPriceFilter = {};
      if (filters.minPrice !== undefined) {
        originalPriceFilter.$gte = Number(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        originalPriceFilter.$lte = Number(filters.maxPrice);
      }
      if (Object.keys(originalPriceFilter).length > 0) {
        filterConditions.$or.push({ originalPrice: originalPriceFilter });
      }
    }

    // Combine text search and filters
    const finalQuery = {
      $and: [
        textSearchQuery,
        filterConditions
      ]
    };

    // Remove empty $and conditions
    if (Object.keys(filterConditions).length === 0) {
      delete finalQuery.$and;
    }

    // Execute search with text score for relevance sorting
    const products = await Product.find(finalQuery)
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .lean();

    return products;

  } catch (error) {
    console.error('Product search error:', error);
    throw new ErrorHandler(`Search failed: ${error.message}`, 500);
  }
};

/**
 * Simple product search by name (for autocomplete/suggestions)
 * @param {string} query - Search query string
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of product names
 */
const searchProductNames = async (query, limit = 10) => {
  try {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return [];
    }

    const products = await Product.find({
      name: { $regex: query, $options: 'i' }
    })
    .select('name')
    .limit(limit)
    .lean();

    return products.map(p => p.name);

  } catch (error) {
    console.error('Product name search error:', error);
    throw new ErrorHandler(`Name search failed: ${error.message}`, 500);
  }
};

module.exports = {
  searchProducts,
  searchProductNames
};