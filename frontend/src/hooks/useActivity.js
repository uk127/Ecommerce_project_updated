import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  storeSearchHistory,
  storeViewedProduct,
  storeClickedProduct,
  getUserActivity,
  deleteSearchHistoryItem,
  clearAllSearchHistory,
} from "../redux/actions/activity";

/**
 * Custom hook for tracking user activity
 * This hook provides methods to track user interactions for the recommendation system
 * 
 * Usage:
 * const { trackSearch, trackView, trackClick, fetchActivity } = useActivity();
 * 
 * // Track search
 * trackSearch("wireless headphones");
 * 
 * // Track product view
 * trackView(product._id);
 * 
 * // Track product click
 * trackClick(product._id);
 */
const useActivity = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.user);
  const { activity } = useSelector((state) => state.activity || {});

  /**
   * Track search keyword when user searches
   * @param {string} keyword - The search keyword
   */
  const trackSearch = useCallback(
    (keyword) => {
      if (!isAuthenticated || !keyword) return Promise.resolve(null);
      return dispatch(storeSearchHistory(keyword));
    },
    [dispatch, isAuthenticated]
  );

  /**
   * Track product view when user opens product page
   * @param {string} productId - The product ID being viewed
   */
  const trackView = useCallback(
    (productId) => {
      if (!isAuthenticated || !productId) return Promise.resolve(null);
      return dispatch(storeViewedProduct(productId));
    },
    [dispatch, isAuthenticated]
  );

  /**
   * Track product click when user clicks a product card
   * @param {string} productId - The product ID being clicked
   */
  const trackClick = useCallback(
    (productId) => {
      if (!isAuthenticated || !productId) return Promise.resolve(null);
      return dispatch(storeClickedProduct(productId));
    },
    [dispatch, isAuthenticated]
  );

  /**
   * Fetch current user's activity data
   */
  const fetchActivity = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve(null);
    return dispatch(getUserActivity());
  }, [dispatch, isAuthenticated]);

  /**
   * Delete a specific search history item
   * @param {string} keyword - The keyword to delete
   */
  const deleteSearchKeyword = useCallback(
    (keyword) => {
      if (!isAuthenticated || !keyword) return Promise.resolve(null);
      return dispatch(deleteSearchHistoryItem(keyword));
    },
    [dispatch, isAuthenticated]
  );

  /**
   * Clear all search history
   */
  const clearSearchHistory = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve(null);
    return dispatch(clearAllSearchHistory());
  }, [dispatch, isAuthenticated]);

  return {
    trackSearch,
    trackView,
    trackClick,
    fetchActivity,
    deleteSearchKeyword,
    clearSearchHistory,
    activity,
    isAuthenticated,
    user,
  };
};

export default useActivity;