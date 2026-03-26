/**
 * Clustering Routes
 * 
 * Routes for user clustering operations.
 * All routes use the existing MongoDB connection from the server.
 */

const express = require("express");
const router = express.Router();
const {
  runClustering,
  getUserSegment,
  getUsersBySegment,
  getSegmentSummary,
} = require("../controller/clusteringController");

/**
 * GET /api/v2/clustering/run
 * 
 * Run K-means clustering on users and save results to database
 * 
 * Query Parameters:
 *   - k: Number of clusters (default: 3, range: 1-10)
 * 
 * Response:
 *   {
 *     "success": true,
 *     "message": "Clustering completed and saved",
 *     "data": {
 *       "success": true,
 *       "message": "Segmented 50 users into 3 clusters",
 *       "segments": [...],
 *       "clusterSummary": {...},
 *       "metadata": {...}
 *     }
 *   }
 */
router.get("/run", runClustering);

/**
 * GET /api/v2/clustering/user/:userId
 * 
 * Get a user's segment
 * 
 * Route Parameters:
 *   - userId: User ID to look up
 * 
 * Response:
 *   {
 *     "success": true,
 *     "segment": "budget",
 *     "cluster": 0,
 *     "data": {...}
 *   }
 */
router.get("/user/:userId", getUserSegment);

/**
 * GET /api/v2/clustering/segment/:segment
 * 
 * Get all users in a specific segment
 * 
 * Route Parameters:
 *   - segment: Segment name (budget, regular, premium)
 * 
 * Response:
 *   {
 *     "success": true,
 *     "segment": "budget",
 *     "count": 15,
 *     "users": ["userId1", "userId2", ...]
 *   }
 */
router.get("/segment/:segment", getUsersBySegment);

/**
 * GET /api/v2/clustering/summary
 * 
 * Get segment distribution summary
 * 
 * Response:
 *   {
 *     "success": true,
 *     "summary": {
 *       "budget": 15,
 *       "regular": 25,
 *       "premium": 10
 *     },
 *     "totalUsers": 50
 *   }
 */
router.get("/summary", getSegmentSummary);

module.exports = router;