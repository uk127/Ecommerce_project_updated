/**
 * Incremental User Clustering Module
 * 
 * This module handles individual user clustering updates when triggered by
 * database changes (new orders, activity updates). Unlike the bulk clustering
 * that processes all users at once, this focuses on updating a single user's
 * segment efficiently.
 * 
 * Usage:
 *   const { incrementalClusterUser } = require('./utils/incrementalClusterUser');
 *   await incrementalClusterUser(userId);
 * 
 * Integration:
 *   - Called automatically via MongoDB Change Streams (see server.js)
 *   - Can also be called manually for specific user updates
 */

const axios = require("axios");
const UserCluster = require("../model/userCluster");
const Order = require("../model/order");
const UserActivity = require("../model/userActivity");

// Configuration
const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5000";
const CLUSTER_ENDPOINT = "/segment-users";
const DEFAULT_K = 3;

/**
 * Get order metrics for a single user
 * 
 * @param {String} userId - User ID to fetch metrics for
 * @returns {Object} Order metrics { totalSpent, totalOrders, avgPrice }
 */
const getUserOrderMetrics = async (userId) => {
    try {
        console.log(`[IncrementalCluster] Fetching order metrics for user: ${userId}`);

        const orderMetrics = await Order.aggregate([
            {
                $match: {
                    $or: [
                        { "user._id": require("mongoose").Types.ObjectId(userId) },
                        { "user._id": userId }  // fallback if stored as string
                    ]
                }
            },
            {
                $group: {
                    _id: "$user._id",
                    totalSpent: { $sum: "$totalPrice" },
                    totalOrders: { $sum: 1 },
                    avgPrice: { $avg: "$totalPrice" }
                }
            }
        ]);

        if (orderMetrics.length === 0) {
            return {
                totalSpent: 0,
                totalOrders: 0,
                avgPrice: 0
            };
        }

        const metric = orderMetrics[0];
        return {
            totalSpent: Math.round(metric.totalSpent * 100) / 100,
            totalOrders: metric.totalOrders,
            avgPrice: Math.round(metric.avgPrice * 100) / 100
        };
    } catch (error) {
        console.error(`[IncrementalCluster] Error fetching order metrics: ${error.message}`);
        throw error;
    }
};

/**
 * Get click count for a single user
 * 
 * @param {String} userId - User ID to fetch clicks for
 * @returns {Number} Number of product clicks
 */
const getUserClickMetrics = async (userId) => {
    try {
        console.log(`[IncrementalCluster] Fetching click metrics for user: ${userId}`);

        const activity = await UserActivity.findOne({ user_id: userId }).lean();

        if (!activity || !activity.clicked_products) {
            return 0;
        }

        return activity.clicked_products.length;
    } catch (error) {
        console.error(`[IncrementalCluster] Error fetching click metrics: ${error.message}`);
        throw error;
    }
};

/**
 * Check if user has meaningful activity for clustering
 * 
 * A user should be clustered only if they have:
 *   - At least one order (totalOrders > 0), OR
 *   - At least one product click (clicks > 0)
 * 
 * @param {Object} orderMetrics - User's order metrics
 * @param {Number} clicks - User's click count
 * @returns {Boolean} True if user has meaningful activity
 */
const hasMeaningfulActivity = (orderMetrics, clicks) => {
    const hasOrders = orderMetrics.totalOrders > 0;
    const hasClicks = clicks > 0;

    console.log(`[IncrementalCluster] Activity check - Orders: ${orderMetrics.totalOrders}, Clicks: ${clicks}`);

    return hasOrders || hasClicks;
};

/**
 * Send single user data to Flask API for clustering
 * 
 * The Flask API expects an array of users, so we send a single-element array
 * and extract the first result from the response.
 * 
 * @param {Object} userData - Single user object { userId, totalSpent, totalOrders, avgPrice, clicks }
 * @param {Number} k - Number of clusters (default: 3)
 * @returns {Object} Cluster result for the user
 */
const sendUserToFlaskAPI = async (userData, k = DEFAULT_K) => {
    try {
        console.log(`[IncrementalCluster] Sending user ${userData.userId} to Flask API for clustering...`);

        // Flask API expects an array of users
        const response = await axios.post(`${FLASK_API_URL}${CLUSTER_ENDPOINT}`, {
            k: k,
            users: [userData] // Send as single-element array
        }, {
            headers: {
                "Content-Type": "application/json",
            },
            timeout: 30000 // 30 second timeout
        });

        const data = response.data;

        // Extract the first (and only) segment from the response
        if (data.success && data.segments && data.segments.length > 0) {
            return data.segments[0];
        }

        throw new Error("Invalid response from Flask API: no segment returned");
    } catch (error) {
        if (error.response) {
            throw new Error(`Flask API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            throw new Error(`Flask API unavailable: No response received. Is the Flask server running at ${FLASK_API_URL}?`);
        } else {
            throw error;
        }
    }
};

/**
 * Save or update user cluster in database
 * 
 * Uses findOneAndUpdate with upsert to create new or update existing record.
 * 
 * @param {String} userId - User ID
 * @param {Number} cluster - Cluster number
 * @param {String} segment - Segment label (budget, regular, premium)
 * @returns {Object} Saved/updated UserCluster document
 */
const saveUserCluster = async (userId, cluster, segment) => {
    try {
        console.log(`[IncrementalCluster] Saving cluster for user ${userId}: cluster=${cluster}, segment=${segment}`);

        const result = await UserCluster.findOneAndUpdate(
            { userId },
            {
                userId,
                cluster,
                segment,
                createdAt: new Date()
            },
            {
                upsert: true,  // Create if doesn't exist
                new: true,      // Return the updated document
                setDefaultsOnInsert: true
            }
        );

        console.log(`[IncrementalCluster] Successfully saved cluster for user ${userId}`);
        return result;
    } catch (error) {
        console.error(`[IncrementalCluster] Error saving user cluster: ${error.message}`);
        throw error;
    }
};

/**
 * Main function: Incrementally cluster a single user
 * 
 * This function:
 * 1. Fetches order metrics for the user
 * 2. Fetches click metrics for the user
 * 3. Checks if user has meaningful activity
 * 4. If yes, sends data to Flask API for clustering
 * 5. Saves the cluster result to UserCluster collection
 * 
 * @param {String} userId - User ID to cluster
 * @param {Number} k - Number of clusters (default: 3)
 * @returns {Object} Result object { success, message, data }
 */
const incrementalClusterUser = async (userId, k = DEFAULT_K) => {
    console.log("=".repeat(50));
    console.log(`[IncrementalCluster] Starting incremental clustering for user: ${userId}`);
    console.log("=".repeat(50));

    try {
        // Step 1: Get order metrics for this user
        const orderMetrics = await getUserOrderMetrics(userId);

        // Step 2: Get click metrics for this user
        const clicks = await getUserClickMetrics(userId);

        // Step 3: Check if user has meaningful activity
        if (!hasMeaningfulActivity(orderMetrics, clicks)) {
            console.log(`[IncrementalCluster] User ${userId} has no meaningful activity (orders: ${orderMetrics.totalOrders}, clicks: ${clicks}). Skipping clustering.`);

            // Optionally: Remove user from cluster collection if they have no activity
            await UserCluster.deleteOne({ userId });

            return {
                success: false,
                message: "User has no meaningful activity - skipped clustering",
                userId,
                data: null
            };
        }

        // Step 4: Prepare user data for Flask API
        const userData = {
            userId: userId,
            totalSpent: orderMetrics.totalSpent,
            totalOrders: orderMetrics.totalOrders,
            avgPrice: orderMetrics.avgPrice,
            clicks: clicks
        };

        console.log(`[IncrementalCluster] User data prepared:`, userData);

        // Step 5: Send to Flask API for clustering
        const clusterResult = await sendUserToFlaskAPI(userData, k);

        console.log(`[IncrementalCluster] Flask API returned:`, clusterResult);

        // Step 6: Save result to database
        const savedCluster = await saveUserCluster(
            userId,
            clusterResult.cluster,
            clusterResult.segment
        );

        console.log("=".repeat(50));
        console.log(`[IncrementalCluster] Successfully completed clustering for user: ${userId}`);
        console.log("=".repeat(50));

        return {
            success: true,
            message: "User clustered successfully",
            userId,
            data: {
                cluster: clusterResult.cluster,
                segment: clusterResult.segment,
                savedAt: savedCluster.createdAt
            }
        };
    } catch (error) {
        console.error(`[IncrementalCluster] Error clustering user ${userId}: ${error.message}`);

        return {
            success: false,
            message: error.message,
            userId,
            data: null
        };
    }
};

// Export functions for use in other modules
module.exports = {
    incrementalClusterUser,
    getUserOrderMetrics,
    getUserClickMetrics,
    hasMeaningfulActivity,
    sendUserToFlaskAPI,
    saveUserCluster
};