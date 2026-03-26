/**
 * Analytics Routes
 * 
 * Routes for seller analytics dashboard
 */

const express = require("express");
const router = express.Router();
const { getSellerAnalytics, getAnalyticsSummary } = require("../controller/analytics");
const { isAuthenticated, isSeller } = require("../middleware/auth");

// Get full analytics for a seller
router.get("/:sellerId", getSellerAnalytics);

// Get analytics summary (lighter endpoint)
router.get("/:sellerId/summary", getAnalyticsSummary);

module.exports = router;