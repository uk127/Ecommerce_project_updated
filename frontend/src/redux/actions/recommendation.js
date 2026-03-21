/**
 * Redux Actions for Product Recommendations
 * 
 * These actions handle fetching personalized product recommendations
 * from the backend recommendation system.
 */

import axios from "axios";
import { server } from "../../server";

/**
 * Fetch personalized recommendations for the authenticated user
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