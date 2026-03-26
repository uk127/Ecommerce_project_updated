/**
 * Clustering Controller
 * 
 * Handles HTTP requests for user clustering operations.
 * Uses the existing MongoDB connection from the server.
 * Saves clustering results to UserCluster collection.
 */

const { clusterUsers } = require("../utils/clusterUsers");
const UserCluster = require("../model/userCluster");

/**
 * Run user clustering and save results to database
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * Query Parameters:
 *   - k: Number of clusters (default: 3, range: 1-10)
 * 
 * Response:
 *   - success: boolean
 *   - message: string
 *   - data: clustering result from Flask API
 */
const runClustering = async (req, res) => {
  try {
    // Get number of clusters from query parameter (default to 3)
    const k = parseInt(req.query.k, 10) || 3;

    // Validate k value
    if (k < 1 || k > 10) {
      return res.status(400).json({
        success: false,
        message: "Invalid k value. k must be between 1 and 10.",
      });
    }

    console.log(`[Clustering] Request received: k=${k}`);

    // Run clustering (uses existing MongoDB connection)
    const result = await clusterUsers(k);

    // Check if clustering was successful and has segments
    if (!result || !result.success || !result.segments || result.segments.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Clustering completed but no segments were returned",
        data: result,
      });
    }

    console.log(`[Clustering] Saving ${result.segments.length} user segments to database...`);

    // Clear old cluster assignments (optional: fresh results each run)
    await UserCluster.deleteMany({});

    // Save each user's cluster assignment
    const savePromises = result.segments.map(async (segmentData) => {
      const { userId, cluster, segment } = segmentData;

      // Use findOneAndUpdate with upsert to create or update
      return UserCluster.findOneAndUpdate(
        { userId },
        {
          userId,
          cluster,
          segment,
          createdAt: new Date(),
        },
        {
          upsert: true,
          new: true,
        }
      );
    });

    // Wait for all saves to complete
    await Promise.all(savePromises);

    console.log(`[Clustering] Successfully saved ${result.segments.length} user segments`);

    // Return success response
    res.status(200).json({
      success: true,
      message: "Clustering completed and saved",
      data: result,
    });
  } catch (error) {
    console.error(`[Clustering] Error: ${error.message}`);

    // Return error response
    res.status(500).json({
      success: false,
      message: "Clustering failed",
      error: error.message,
    });
  }
};

/**
 * Get a user's segment
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * Route Parameters:
 *   - userId: User ID to look up
 * 
 * Response:
 *   - success: boolean
 *   - segment: string (budget, regular, premium) or null
 */
const getUserSegment = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const userCluster = await UserCluster.getUserSegment(userId);

    if (!userCluster) {
      return res.status(404).json({
        success: false,
        message: "User segment not found. Run clustering first.",
        segment: null,
      });
    }

    res.status(200).json({
      success: true,
      segment: userCluster.segment,
      cluster: userCluster.cluster,
      data: userCluster,
    });
  } catch (error) {
    console.error(`[Clustering] Error getting user segment: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to get user segment",
      error: error.message,
    });
  }
};

/**
 * Get all users in a specific segment
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * Route Parameters:
 *   - segment: Segment name (budget, regular, premium)
 * 
 * Response:
 *   - success: boolean
 *   - users: Array of user IDs in the segment
 */
const getUsersBySegment = async (req, res) => {
  try {
    const { segment } = req.params;

    // Validate segment
    const validSegments = ["budget", "regular", "premium"];
    if (!validSegments.includes(segment)) {
      return res.status(400).json({
        success: false,
        message: `Invalid segment. Must be one of: ${validSegments.join(", ")}`,
      });
    }

    const users = await UserCluster.getUsersBySegment(segment);

    res.status(200).json({
      success: true,
      segment,
      count: users.length,
      users: users.map((u) => u.userId),
    });
  } catch (error) {
    console.error(`[Clustering] Error getting users by segment: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to get users by segment",
      error: error.message,
    });
  }
};

/**
 * Get segment distribution summary
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * Response:
 *   - success: boolean
 *   - summary: Object with count per segment
 */
const getSegmentSummary = async (req, res) => {
  try {
    const summary = await UserCluster.getSegmentSummary();

    // Format the summary
    const formattedSummary = {
      budget: 0,
      regular: 0,
      premium: 0,
    };

    summary.forEach((item) => {
      formattedSummary[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      summary: formattedSummary,
      totalUsers: Object.values(formattedSummary).reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    console.error(`[Clustering] Error getting segment summary: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to get segment summary",
      error: error.message,
    });
  }
};

module.exports = {
  runClustering,
  getUserSegment,
  getUsersBySegment,
  getSegmentSummary,
};