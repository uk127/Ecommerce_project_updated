# User Clustering Module

## Overview

The `clusterUsers.js` module aggregates user data from MongoDB collections and sends it to a Flask API for K-Means clustering. This enables customer segmentation for targeted marketing and personalized experiences.

**⚠️ IMPORTANT**: This module is **connection-agnostic**. It requires an existing MongoDB connection managed by the calling server. It does NOT create or close database connections.

## Features

- **Order Metrics Aggregation**: Calculates `totalSpent`, `totalOrders`, and `avgPrice` per user
- **Activity Tracking**: Counts product clicks from user activity data
- **K-Means Clustering**: Segments users into `budget`, `regular`, and `premium` categories
- **Flask API Integration**: Sends data to ML service for processing
- **Connection-Agnostic**: Uses existing MongoDB connection from the server

## Prerequisites

1. **MongoDB**: Must be already connected via the server's database connection
2. **Flask ML Service**: Must be running at `http://localhost:5000`
3. **Node.js**: Version 24.0.0 or higher

## Installation

No additional installation required. The module uses existing dependencies:
- `mongoose` - MongoDB models (uses existing connection)
- `axios` - HTTP requests

## Usage

### Import as a Module (Required)

This module must be imported into your server - it cannot be run standalone.

```javascript
const { clusterUsers } = require('./utils/clusterUsers');

// Use default k=3
const result = await clusterUsers();

// Or specify custom k
const result = await clusterUsers(4);
```

### In an Express Route

```javascript
// backend/controller/segmentation.js
const { clusterUsers } = require('../utils/clusterUsers');

exports.segmentUsers = async (req, res) => {
  try {
    const k = req.body.k || 3;
    const result = await clusterUsers(k);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

## How It Works

### Step 1: Order Metrics Aggregation

The module reads the `orders` collection and groups by user ID:

```javascript
// MongoDB Aggregation Pipeline
Order.aggregate([
  {
    $group: {
      _id: "$user._id",
      totalSpent: { $sum: "$totalPrice" },
      totalOrders: { $sum: 1 },
      avgPrice: { $avg: "$totalPrice" }
    }
  }
])
```

**Example Order Document:**
```json
{
  "_id": "order123",
  "user": {
    "_id": "user456",
    "name": "John Doe"
  },
  "totalPrice": 150.00,
  "cart": [...],
  "status": "Delivered"
}
```

### Step 2: Click Metrics Collection

Reads `useractivity` collection and counts `clicked_products`:

```javascript
UserActivity.aggregate([
  {
    $project: {
      user_id: 1,
      clicks: { $size: { $ifNull: ["$clicked_products", []] } }
    }
  }
])
```

**Example UserActivity Document:**
```json
{
  "_id": "activity789",
  "user_id": "user456",
  "clicked_products": [
    { "product_id": "prod1", "clicked_at": "2024-01-15" },
    { "product_id": "prod2", "clicked_at": "2024-01-16" }
  ]
}
```

### Step 3: Data Combination

Merges order and click data into unified user objects:

```json
[
  {
    "userId": "user456",
    "totalSpent": 150.00,
    "totalOrders": 2,
    "avgPrice": 75.00,
    "clicks": 5
  },
  {
    "userId": "user789",
    "totalSpent": 500.00,
    "totalOrders": 10,
    "avgPrice": 50.00,
    "clicks": 25
  }
]
```

### Step 4: Flask API Request

Sends POST request to `http://localhost:5000/segment-users`:

```javascript
axios.post('http://localhost:5000/segment-users', {
  k: 3,
  users: [
    { userId: "user1", totalSpent: 150, totalOrders: 2, avgPrice: 75, clicks: 5 },
    { userId: "user2", totalSpent: 500, totalOrders: 10, avgPrice: 50, clicks: 25 }
  ]
})
```

### Step 5: Response

Flask API returns cluster assignments:

```json
{
  "success": true,
  "message": "Segmented 50 users into 3 clusters",
  "segments": [
    {
      "userId": "user456",
      "cluster": 0,
      "segment": "budget"
    },
    {
      "userId": "user789",
      "cluster": 2,
      "segment": "premium"
    }
  ],
  "clusterSummary": {
    "budget": 15,
    "regular": 25,
    "premium": 10
  },
  "metadata": {
    "k": 3,
    "totalUsers": 50,
    "processingTimeMs": 125.5
  }
}
```

## Example Execution

### Successful Run

When called from a server route (assuming MongoDB is already connected):

```
==================================================
Starting User Clustering Process
==================================================
Aggregating order metrics...
Found order metrics for 45 users
Aggregating click metrics...
Found click metrics for 38 users
Combining metrics...
Combined data for 50 users
Sending 50 users to Flask API for clustering (k=3)...

==================================================
Flask API Response:
==================================================
{
  "success": true,
  "message": "Segmented 50 users into 3 clusters",
  "segments": [
    {"userId": "64abc123", "cluster": 0, "segment": "budget"},
    {"userId": "64abc456", "cluster": 1, "segment": "regular"},
    {"userId": "64abc789", "cluster": 2, "segment": "premium"}
  ],
  "clusterSummary": {
    "budget": 15,
    "regular": 25,
    "premium": 10
  }
}
```

### Error Handling

```
==================================================
Error in clustering process:
==================================================
Flask API unavailable: No response received. Is the Flask server running at http://localhost:5000?
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_URL` | Required | MongoDB connection string (used by server) |
| `FLASK_API_URL` | `http://localhost:5000` | Flask ML service URL |

## Segment Labels

The Flask API assigns segment labels based on total spending:

| Segment | Description |
|---------|-------------|
| `budget` | Lowest spending users |
| `regular` | Medium spending users |
| `premium` | Highest spending users |

## Integration Examples

### Use in Express Route

```javascript
// backend/controller/segmentation.js
const { clusterUsers } = require('../utils/clusterUsers');

exports.segmentUsers = async (req, res) => {
  try {
    const k = req.body.k || 3;
    const result = await clusterUsers(k);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Scheduled Job (Cron)

```javascript
// Run clustering daily at midnight
const cron = require('node-cron');
const { clusterUsers } = require('./utils/clusterUsers');

cron.schedule('0 0 * * *', async () => {
  console.log('Running daily user segmentation...');
  await clusterUsers();
});
```

## Troubleshooting

### MongoDB Connection Error
```
Error: Mongoose is not connected
```
**Solution**: Ensure the server has established a MongoDB connection before calling `clusterUsers()`

### Flask API Unavailable
```
Flask API unavailable: No response received
```
**Solution**: Start the Flask server:
```bash
cd ml
python res.py
```

### No Users Found
```
⚠️  No users found for clustering.
```
**Solution**: Ensure orders and user activities exist in the database

## Exported Functions

```javascript
const {
  clusterUsers,           // Main function - orchestrates the clustering process
  aggregateOrderMetrics,  // Aggregates order data per user
  getClickMetrics,        // Gets click counts from user activity
  combineMetrics,         // Combines order and click metrics
  sendToFlaskAPI          // Sends data to Flask API
} = require('./utils/clusterUsers');