/**
 * MongoDB Change Streams for Incremental Clustering
 * 
 * This module sets up MongoDB Change Streams to watch for database changes
 * and trigger incremental user clustering when relevant events occur.
 * 
 * Watched Collections:
 * 1. `orders` - Watch for new orders to trigger clustering for the user
 * 2. `useractivities` - Watch for updates to clicked_products to trigger clustering
 * 
 * Usage:
 *   const { setupChangeStreams } = require('./utils/changeStreams');
 *   // After mongoose connection is established:
 *   setupChangeStreams();
 */

const mongoose = require("mongoose");
const { incrementalClusterUser } = require("./incrementalClusterUser");

// Track active change streams for cleanup
let orderChangeStream = null;
let activityChangeStream = null;

/**
 * Extract user ID from order document
 * Handles both embedded user object and direct user reference
 * 
 * @param {Object} orderDoc - Order document from change stream
 * @returns {String|null} User ID or null if not found
 */
const extractUserIdFromOrder = (orderDoc) => {
  try {
    // Case 1: User is embedded as { _id, name, email, ... }
    if (orderDoc.user && orderDoc.user._id) {
      return orderDoc.user._id.toString();
    }
    
    // Case 2: User is stored as ObjectId reference
    if (orderDoc.user && typeof orderDoc.user === "object" && orderDoc.user.constructor.name === "ObjectId") {
      return orderDoc.user.toString();
    }
    
    // Case 3: User is stored as string ObjectId
    if (orderDoc.user && typeof orderDoc.user === "string") {
      return orderDoc.user;
    }
    
    console.warn("[ChangeStream] Could not extract user ID from order document");
    return null;
  } catch (error) {
    console.error(`[ChangeStream] Error extracting user ID: ${error.message}`);
    return null;
  }
};

/**
 * Handle new order event from change stream
 * 
 * @param {Object} change - Change stream event document
 */
const handleNewOrder = async (change) => {
  try {
    console.log("[ChangeStream] New order detected:", change._id);
    
    // Extract the full document from the change event
    const orderDoc = change.fullDocument;
    
    if (!orderDoc) {
      console.warn("[ChangeStream] No document in change event");
      return;
    }
    
    // Extract user ID from the order
    const userId = extractUserIdFromOrder(orderDoc);
    
    if (!userId) {
      console.warn("[ChangeStream] Could not determine user ID for new order");
      return;
    }
    
    console.log(`[ChangeStream] Triggering incremental clustering for user: ${userId}`);
    
    // Trigger incremental clustering (async - don't block)
    // Using setImmediate to ensure we don't block the event loop
    setImmediate(() => {
      incrementalClusterUser(userId)
        .then((result) => {
          if (result.success) {
            console.log(`[ChangeStream] Successfully clustered user ${userId}: ${result.data.segment}`);
          } else {
            console.log(`[ChangeStream] Clustering skipped for user ${userId}: ${result.message}`);
          }
        })
        .catch((error) => {
          console.error(`[ChangeStream] Error clustering user ${userId}: ${error.message}`);
        });
    });
  } catch (error) {
    console.error(`[ChangeStream] Error handling new order: ${error.message}`);
  }
};

/**
 * Handle user activity update event from change stream
 * Only triggers clustering when clicked_products is modified
 * 
 * @param {Object} change - Change stream event document
 */
const handleActivityUpdate = async (change) => {
  try {
    console.log("[ChangeStream] User activity update detected:", change._id);
    
    // Check if clicked_products was updated
    const updatedFields = change.updateDescription ? change.updateDescription.updatedFields : {};
    const clickedProductsUpdated = Object.keys(updatedFields).some(
      (field) => field.startsWith("clicked_products")
    );
    
    if (!clickedProductsUpdated) {
      console.log("[ChangeStream] Update did not modify clicked_products - skipping");
      return;
    }
    
    // Get user ID from the document key
    const documentId = change.documentKey ? change.documentKey._id : null;
    
    if (!documentId) {
      console.warn("[ChangeStream] Could not determine document ID from activity update");
      return;
    }
    
    // The documentId is the user_id in useractivities collection
    const userId = documentId.toString();
    
    console.log(`[ChangeStream] Triggering incremental clustering for user: ${userId}`);
    
    // Trigger incremental clustering (async - don't block)
    setImmediate(() => {
      incrementalClusterUser(userId)
        .then((result) => {
          if (result.success) {
            console.log(`[ChangeStream] Successfully clustered user ${userId}: ${result.data.segment}`);
          } else {
            console.log(`[ChangeStream] Clustering skipped for user ${userId}: ${result.message}`);
          }
        })
        .catch((error) => {
          console.error(`[ChangeStream] Error clustering user ${userId}: ${error.message}`);
        });
    });
  } catch (error) {
    console.error(`[ChangeStream] Error handling activity update: ${error.message}`);
  }
};

/**
 * Setup change stream for orders collection
 * Watches for new order insertions
 * 
 * @param {Object} connection - Mongoose connection object
 */
const setupOrdersChangeStream = (connection) => {
  try {
    // Get the native MongoDB collection from mongoose
    const ordersCollection = connection.collection("orders");
    
    // Create change stream for insert operations only
    orderChangeStream = ordersCollection.watch(
      [
        {
          $match: {
            operationType: "insert" // Only watch for new documents
          }
        }
      ],
      {
        fullDocument: "default" // Include the full document in the event
      }
    );
    
    console.log("[ChangeStream] Watching 'orders' collection for new orders...");
    
    // Handle change events
    orderChangeStream.on("change", handleNewOrder);
    
    // Handle errors
    orderChangeStream.on("error", (error) => {
      console.error("[ChangeStream] Orders change stream error:", error.message);
    });
    
    return orderChangeStream;
  } catch (error) {
    console.error(`[ChangeStream] Failed to setup orders change stream: ${error.message}`);
    return null;
  }
};

/**
 * Setup change stream for useractivities collection
 * Watches for updates to clicked_products field
 * 
 * @param {Object} connection - Mongoose connection object
 */
const setupActivityChangeStream = (connection) => {
  try {
    // Get the native MongoDB collection from mongoose
    const activityCollection = connection.collection("useractivities");
    
    // Create change stream for update operations
    activityChangeStream = activityCollection.watch(
      [
        {
          $match: {
            operationType: { $in: ["update", "insert"] } // Watch for updates and new documents
          }
        }
      ]
    );
    
    console.log("[ChangeStream] Watching 'useractivities' collection for updates...");
    
    // Handle change events
    activityChangeStream.on("change", handleActivityUpdate);
    
    // Handle errors
    activityChangeStream.on("error", (error) => {
      console.error("[ChangeStream] Activity change stream error:", error.message);
    });
    
    return activityChangeStream;
  } catch (error) {
    console.error(`[ChangeStream] Failed to setup activity change stream: ${error.message}`);
    return null;
  }
};

/**
 * Setup all change streams
 * Call this after mongoose connection is established
 * 
 * @returns {Object} Object containing the change stream references
 */
const setupChangeStreams = () => {
  console.log("=".repeat(50));
  console.log("[ChangeStream] Setting up MongoDB Change Streams...");
  console.log("=".repeat(50));
  
  // Check if mongoose is connected
  if (mongoose.connection.readyState !== 1) {
    console.error("[ChangeStream] Mongoose is not connected. Change streams require active connection.");
    console.log(`[ChangeStream] Connection state: ${mongoose.connection.readyState}`);
    return null;
  }
  
  // Get the native MongoDB connection from mongoose
  const connection = mongoose.connection.db;
  
  // Setup orders change stream
  const ordersStream = setupOrdersChangeStream(connection);
  
  // Setup useractivities change stream
  const activityStream = setupActivityChangeStream(connection);
  
  if (ordersStream && activityStream) {
    console.log("[ChangeStream] All change streams initialized successfully");
    console.log("[ChangeStream] Incremental clustering will be triggered automatically");
    console.log("=".repeat(50));
  } else {
    console.warn("[ChangeStream] Some change streams failed to initialize");
  }
  
  return {
    orderChangeStream: ordersStream,
    activityChangeStream: activityStream
  };
};

/**
 * Close all change streams
 * Call this during graceful shutdown
 */
const closeChangeStreams = async () => {
  console.log("[ChangeStream] Closing change streams...");
  
  try {
    if (orderChangeStream) {
      await orderChangeStream.close();
      console.log("[ChangeStream] Orders change stream closed");
    }
    
    if (activityChangeStream) {
      await activityChangeStream.close();
      console.log("[ChangeStream] Activity change stream closed");
    }
  } catch (error) {
    console.error(`[ChangeStream] Error closing change streams: ${error.message}`);
  }
};

module.exports = {
  setupChangeStreams,
  closeChangeStreams,
  handleNewOrder,
  handleActivityUpdate
};