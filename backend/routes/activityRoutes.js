const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const {
  storeSearchHistory,
  storeViewedProduct,
  storeClickedProduct,
  getUserActivity,
  getAllUserActivities,
  deleteSearchHistoryItem,
  clearAllSearchHistory,
} = require("../controller/activity");

// All routes are protected - activity is stored only if user is logged in

// POST /api/activity/search - Store search keyword
router.post("/search", isAuthenticated, storeSearchHistory);

// POST /api/activity/view - Store viewed product
router.post("/view", isAuthenticated, storeViewedProduct);

// POST /api/activity/click - Store clicked product
router.post("/click", isAuthenticated, storeClickedProduct);

// GET /api/activity/me - Get current user's activity
router.get("/me", isAuthenticated, getUserActivity);

// GET /api/activity/all - Get all user activities (for recommendation system)
router.get("/all", isAuthenticated, getAllUserActivities);

// DELETE /api/activity/search/:keyword - Delete specific search history item
router.delete("/search/:keyword", isAuthenticated, deleteSearchHistoryItem);

// DELETE /api/activity/search - Clear all search history
router.delete("/search", isAuthenticated, clearAllSearchHistory);

module.exports = router;