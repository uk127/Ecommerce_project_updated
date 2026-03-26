/**
 * User Clustering Module
 * 
 * This module aggregates user data from orders and activity collections,
 * then sends the data to a Flask API for K-means clustering.
 * 
 * NOTE: This module requires an existing MongoDB connection.
 * It does NOT create or close connections - the calling server must handle that.
 * 
 * Usage:
 *   const { clusterUsers } = require('./utils/clusterUsers');
 *   const result = await clusterUsers(3);
 */

const axios = require("axios");

// Import models (assumes mongoose is already connected)
const Order = require("../model/order");
const UserActivity = require("../model/userActivity");

// Configuration
const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5000";
const CLUSTER_ENDPOINT = "/segment-users";
const DEFAULT_K = 3;

/**
 * Aggregate order data per user
 * Calculates totalSpent, totalOrders, and avgPrice
 * 
 * @returns {Map} Map of userId to order metrics
 */
const aggregateOrderMetrics = async () => {
  try {
    console.log("Aggregating order metrics...");
    
    // Use MongoDB aggregation pipeline
    const orderMetrics = await Order.aggregate([
      {
        $group: {
          _id: "$user._id", // Group by user ID (embedded in user object)
          totalSpent: { $sum: "$totalPrice" },
          totalOrders: { $sum: 1 },
          avgPrice: { $avg: "$totalPrice" }
        }
      }
    ]);

    // Convert to Map for easier lookup
    const metricsMap = new Map();
    
    for (const metric of orderMetrics) {
      if (metric._id) {
        metricsMap.set(metric._id.toString(), {
          userId: metric._id.toString(),
          totalSpent: Math.round(metric.totalSpent * 100) / 100, // Round to 2 decimal places
          totalOrders: metric.totalOrders,
          avgPrice: Math.round(metric.avgPrice * 100) / 100
        });
      }
    }

    console.log(`Found order metrics for ${metricsMap.size} users`);
    return metricsMap;
  } catch (error) {
    console.error(`Error aggregating order metrics: ${error.message}`);
    throw error;
  }
};

/**
 * Get click counts from user activity collection
 * 
 * @returns {Map} Map of userId to click count
 */
const getClickMetrics = async () => {
  try {
    console.log("Aggregating click metrics...");
    
    // Use MongoDB aggregation to count clicked_products per user
    const clickMetrics = await UserActivity.aggregate([
      {
        $project: {
          user_id: 1,
          clicks: { $size: { $ifNull: ["$clicked_products", []] } }
        }
      }
    ]);

    // Convert to Map for easier lookup
    const clicksMap = new Map();
    
    for (const metric of clickMetrics) {
      if (metric.user_id) {
        clicksMap.set(metric.user_id.toString(), metric.clicks);
      }
    }

    console.log(`Found click metrics for ${clicksMap.size} users`);
    return clicksMap;
  } catch (error) {
    console.error(`Error getting click metrics: ${error.message}`);
    throw error;
  }
};

/**
 * Combine order metrics and click metrics into unified user objects
 * 
 * @param {Map} orderMetrics - Map of order metrics per user
 * @param {Map} clickMetrics - Map of click counts per user
 * @returns {Array} Array of combined user objects
 */
const combineMetrics = (orderMetrics, clickMetrics) => {
  console.log("Combining metrics...");
  
  // Get all unique user IDs from both maps
  const allUserIds = new Set([
    ...orderMetrics.keys(),
    ...clickMetrics.keys()
  ]);

  const combinedData = [];

  for (const userId of allUserIds) {
    const orderData = orderMetrics.get(userId) || {
      userId,
      totalSpent: 0,
      totalOrders: 0,
      avgPrice: 0
    };

    const clicks = clickMetrics.get(userId) || 0;

    combinedData.push({
      userId,
      totalSpent: orderData.totalSpent,
      totalOrders: orderData.totalOrders,
      avgPrice: orderData.avgPrice,
      clicks
    });
  }

  console.log(`Combined data for ${combinedData.length} users`);
  return combinedData;
};

/**
 * Send user data to Flask API for clustering
 * 
 * @param {Array} userData - Array of user objects
 * @param {number} k - Number of clusters
 * @returns {Object} Response from Flask API
 */
const sendToFlaskAPI = async (userData, k = DEFAULT_K) => {
  try {
    console.log(`Sending ${userData.length} users to Flask API for clustering (k=${k})...`);
    
    const response = await axios.post(`${FLASK_API_URL}${CLUSTER_ENDPOINT}`, {
      k: k,
      users: userData
    }, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000 // 30 second timeout
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw new Error(`Flask API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error(`Flask API unavailable: No response received. Is the Flask server running at ${FLASK_API_URL}?`);
    } else {
      // Something happened in setting up the request
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

/**
 * Main function to orchestrate the clustering process
 * This function is connection-agnostic and assumes mongoose is already connected.
 * 
 * @param {number} k - Number of clusters (default: 3)
 * @returns {Object} Clustering result from Flask API
 */
const clusterUsers = async (k = DEFAULT_K) => {
  console.log("=".repeat(50));
  console.log("Starting User Clustering Process");
  console.log("=".repeat(50));
  
  try {
    // Step 1: Aggregate order metrics
    const orderMetrics = await aggregateOrderMetrics();

    // Step 2: Get click metrics
    const clickMetrics = await getClickMetrics();

    // Step 3: Combine all metrics
    const userData = combineMetrics(orderMetrics, clickMetrics);

    // Check if we have users to cluster
    if (userData.length === 0) {
      console.log("\n⚠️  No users found for clustering.");
      return { success: false, message: "No users found" };
    }

    // Step 4: Send to Flask API
    const flaskResponse = await sendToFlaskAPI(userData, k);

    // Step 5: Log the response
    console.log("\n" + "=".repeat(50));
    console.log("Flask API Response:");
    console.log("=".repeat(50));
    console.log(JSON.stringify(flaskResponse, null, 2));

    return flaskResponse;
  } catch (error) {
    console.error("\n" + "=".repeat(50));
    console.error("Error in clustering process:");
    console.error("=".repeat(50));
    console.error(error.message);
    throw error;
  }
};

// Export all functions as a module
module.exports = {
  clusterUsers,
  aggregateOrderMetrics,
  getClickMetrics,
  combineMetrics,
  sendToFlaskAPI
};