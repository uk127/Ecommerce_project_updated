import axios from "axios";
import { server } from "../../server";

// Store search history when user searches in the search bar
export const storeSearchHistory = (keyword) => async (dispatch) => {
  try {
    // Only store if user is logged in (check for token in cookies)
    const response = await axios.post(
      `${server}/activity/search`,
      { keyword },
      { withCredentials: true }
    );
    
    dispatch({
      type: "storeSearchHistorySuccess",
      payload: response.data,
    });
    
    return response.data;
  } catch (error) {
    // Silently fail - search functionality should not be interrupted
    // even if tracking fails (e.g., user not logged in)
    console.log("Search history tracking failed:", error.response?.data?.message || error.message);
    return null;
  }
};

// Store viewed product when the product page is opened
export const storeViewedProduct = (product_id) => async (dispatch) => {
  try {
    const response = await axios.post(
      `${server}/activity/view`,
      { product_id },
      { withCredentials: true }
    );
    
    dispatch({
      type: "storeViewedProductSuccess",
      payload: response.data,
    });
    
    return response.data;
  } catch (error) {
    // Silently fail - viewing should not be interrupted
    console.log("Viewed product tracking failed:", error.response?.data?.message || error.message);
    return null;
  }
};

// Store clicked product when the user clicks a product card
export const storeClickedProduct = (product_id) => async (dispatch) => {
  try {
    const response = await axios.post(
      `${server}/activity/click`,
      { product_id },
      { withCredentials: true }
    );
    
    dispatch({
      type: "storeClickedProductSuccess",
      payload: response.data,
    });
    
    return response.data;
  } catch (error) {
    // Silently fail - clicking should not be interrupted
    console.log("Clicked product tracking failed:", error.response?.data?.message || error.message);
    return null;
  }
};

// Get current user's activity
export const getUserActivity = () => async (dispatch) => {
  try {
    dispatch({
      type: "getUserActivityRequest",
    });
    
    const { data } = await axios.get(`${server}/activity/me`, {
      withCredentials: true,
    });
    
    dispatch({
      type: "getUserActivitySuccess",
      payload: data.activity,
    });
    
    return data.activity;
  } catch (error) {
    dispatch({
      type: "getUserActivityFailed",
      payload: error.response?.data?.message || error.message,
    });
    return null;
  }
};

// Get all user activities (for admin/recommendation system)
export const getAllUserActivities = () => async (dispatch) => {
  try {
    dispatch({
      type: "getAllUserActivitiesRequest",
    });
    
    const { data } = await axios.get(`${server}/activity/all`, {
      withCredentials: true,
    });
    
    dispatch({
      type: "getAllUserActivitiesSuccess",
      payload: data.activities,
    });
    
    return data.activities;
  } catch (error) {
    dispatch({
      type: "getAllUserActivitiesFailed",
      payload: error.response?.data?.message || error.message,
    });
    return null;
  }
};

// Delete a specific search history item
export const deleteSearchHistoryItem = (keyword) => async (dispatch) => {
  try {
    const { data } = await axios.delete(
      `${server}/activity/search/${encodeURIComponent(keyword)}`,
      { withCredentials: true }
    );
    
    dispatch({
      type: "deleteSearchHistoryItemSuccess",
      payload: data.activity,
    });
    
    return data;
  } catch (error) {
    console.log("Delete search history item failed:", error.response?.data?.message || error.message);
    return null;
  }
};

// Clear all search history
export const clearAllSearchHistory = () => async (dispatch) => {
  try {
    const { data } = await axios.delete(
      `${server}/activity/search`,
      { withCredentials: true }
    );
    
    dispatch({
      type: "clearAllSearchHistorySuccess",
      payload: data.activity,
    });
    
    return data;
  } catch (error) {
    console.log("Clear search history failed:", error.response?.data?.message || error.message);
    return null;
  }
};
