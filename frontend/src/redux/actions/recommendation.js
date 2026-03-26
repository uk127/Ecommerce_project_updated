/**
 * Redux Actions for Product Recommendations
 * 
 * These actions handle fetching personalized product recommendations
 * from the backend recommendation system using ADD scoring algorithm.
 * 
 * Scoring Weights:
 * - Click: 3
 * - Order: 4
 * - Score(category) = (click_count × 3) + (order_count × 4)
 */

import axios from "axios";
import { server } from "../../server";

/**
 * Fetch home screen recommendations with ADD scoring
 * This is the primary endpoint for the home page recommendation section.
 * 
 * @param {number} count - Number of recommendations to fetch (default: 20, max: 50)
 * @returns {Promise} - Object with recommendations and metadata
 * 
 * Response includes:
 * - recommendations: Array of products
 * - metadata: {
 *     categoryScores: { "Category1": score, "Category2": score },
 *     distribution: { "Category1": count, "Category2": count },
 *     isPersonalized: boolean,
 *     weights: { CLICK: 3, ORDER: 4 }
 *   }
 */
export const getHomeRecommendations = (count = 20) => async (dispatch) => {
  try {
    dispatch({ type: "getHomeRecommendationsRequest" });

    const { data } = await axios.get(
      `${server}/recommendations/home?count=${Math.min(count, 50)}`,
      {
        withCredentials: true,
      }
    );

    dispatch({
      type: "getHomeRecommendationsSuccess",
      payload: data,
    });

    return data;
  } catch (error) {
    dispatch({
      type: "getHomeRecommendationsFailed",
      payload: error.response?.data?.message || error.message,
    });
    return null;
  }
};

/**
 * Fetch trending products (public endpoint, no authentication required)
 * Used for guest users or as fallback
 * 
 * @param {number} count - Number of products to fetch (default: 20)
 * @returns {Promise} - Object with trending products
 */
export const getTrendingProducts = (count = 20) => async (dispatch) => {
  try {
    dispatch({ type: "getTrendingProductsRequest" });

    const { data } = await axios.get(
      `${server}/recommendations/trending?count=${Math.min(count, 50)}`
    );

    dispatch({
      type: "getTrendingProductsSuccess",
      payload: data,
    });

    return data;
  } catch (error) {
    dispatch({
      type: "getTrendingProductsFailed",
      payload: error.response?.data?.message || error.message,
    });
    return null;
  }
};

/**
 * Fetch personalized recommendations for the authenticated user
 * (Legacy endpoint - returns 10 products)
 * @returns {Promise} - Array of recommended products
 */
export const getPersonalizedRecommendations = () => async (dispatch) => {
  try {
    dispatch({ type: "getRecommendationsRequest" });

    const { data } = await axios.get(`${server}/recommendations`, {
      withCredentials: true,
    });

    dispatch({
      type: "getRecommendationsSuccess",
      payload: data,
    });

    return data;
  } catch (error) {
    dispatch({
      type: "getRecommendationsFailed",
      payload: error.response?.data?.message || error.message,
    });
    return null;
  }
};

/**
 * Fetch quick recommendations (lightweight, just products)
 * @returns {Promise} - Array of recommended products
 */
export const getQuickRecommendations = () => async (dispatch) => {
  try {
    const { data } = await axios.get(`${server}/recommendations/quick`, {
      withCredentials: true,
    });

    return data;
  } catch (error) {
    console.log("Failed to fetch quick recommendations:", error.message);
    return null;
  }
};