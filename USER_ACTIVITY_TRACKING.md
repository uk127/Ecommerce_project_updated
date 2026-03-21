# User Activity Tracking System

This document provides comprehensive documentation for the User Activity Tracking system implemented for the recommendation engine.

## Overview

The User Activity Tracking system captures user interactions across the e-commerce platform to provide data for the recommendation engine. It tracks:

- **Search History** - Keywords users search for
- **Viewed Products** - Products users view in detail
- **Clicked Products** - Products users click on from product cards
- **Purchase History** - Available from the existing orders collection

---

## Backend Implementation

### 1. Mongoose Schema (`backend/model/userActivity.js`)

```javascript
const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  search_history: [
    {
      keyword: {
        type: String,
        required: true,
      },
      searched_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  clicked_products: [
    {
      product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      clicked_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  viewed_products: [
    {
      product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      viewed_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  last_updated: {
    type: Date,
    default: Date.now,
  },
});

userActivitySchema.index({ user_id: 1 });
module.exports = mongoose.model("UserActivity", userActivitySchema);
```

### 2. Controller (`backend/controller/activity.js`)

| Function | Endpoint | Description |
|----------|----------|-------------|
| `storeSearchHistory` | POST /api/v2/activity/search | Stores search keyword with timestamp |
| `storeViewedProduct` | POST /api/v2/activity/view | Stores viewed product with timestamp |
| `storeClickedProduct` | POST /api/v2/activity/click | Stores clicked product with timestamp |
| `getUserActivity` | GET /api/v2/activity/me | Gets current user's activity |
| `getAllUserActivities` | GET /api/v2/activity/all | Gets all user activities (admin) |

All functions use `findOneAndUpdate` with `$push` and `upsert: true` to efficiently add activity without creating duplicates.

### 3. Routes (`backend/routes/activityRoutes.js`)

All routes are protected with `isAuthenticated` middleware - activity is stored only if the user is logged in.

---

## API Endpoints

### POST /api/v2/activity/search

Store a search keyword.

**Request Body:**
```json
{
  "keyword": "wireless headphones"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Search history stored successfully",
  "activity": {
    "_id": "650a1b2c3d4e5f6789012341",
    "user_id": "650a1b2c3d4e5f6789012340",
    "search_history": [
      { "keyword": "wireless headphones", "searched_at": "2024-01-16T10:30:00Z" }
    ],
    "clicked_products": [],
    "viewed_products": [],
    "last_updated": "2024-01-16T10:30:00Z"
  }
}
```

### POST /api/v2/activity/view

Store a viewed product.

**Request Body:**
```json
{
  "product_id": "650a1b2c3d4e5f6789012350"
}
```

### POST /api/v2/activity/click

Store a clicked product.

**Request Body:**
```json
{
  "product_id": "650a1b2c3d4e5f6789012350"
}
```

### GET /api/v2/activity/me

Get current user's activity data.

**Response:**
```json
{
  "success": true,
  "activity": {
    "_id": "650a1b2c3d4e5f6789012341",
    "user_id": "650a1b2c3d4e5f6789012340",
    "search_history": [...],
    "clicked_products": [...],
    "viewed_products": [...],
    "last_updated": "2024-01-16T15:00:00Z"
  }
}
```

---

## Frontend Integration

### 1. Redux Actions (`frontend/src/redux/actions/activity.js`)

```javascript
import axios from "axios";
import { server } from "../../server";

// Store search history
export const storeSearchHistory = (keyword) => async (dispatch) => {
  try {
    const response = await axios.post(
      `${server}/activity/search`,
      { keyword },
      { withCredentials: true }
    );
    dispatch({ type: "storeSearchHistorySuccess", payload: response.data });
    return response.data;
  } catch (error) {
    console.log("Search history tracking failed:", error.message);
    return null;
  }
};

// Store viewed product
export const storeViewedProduct = (product_id) => async (dispatch) => {
  try {
    const response = await axios.post(
      `${server}/activity/view`,
      { product_id },
      { withCredentials: true }
    );
    dispatch({ type: "storeViewedProductSuccess", payload: response.data });
    return response.data;
  } catch (error) {
    console.log("Viewed product tracking failed:", error.message);
    return null;
  }
};

// Store clicked product
export const storeClickedProduct = (product_id) => async (dispatch) => {
  try {
    const response = await axios.post(
      `${server}/activity/click`,
      { product_id },
      { withCredentials: true }
    );
    dispatch({ type: "storeClickedProductSuccess", payload: response.data });
    return response.data;
  } catch (error) {
    console.log("Clicked product tracking failed:", error.message);
    return null;
  }
};
```

### 2. Custom Hook (`frontend/src/hooks/useActivity.js`)

```javascript
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { storeSearchHistory, storeViewedProduct, storeClickedProduct } from "../redux/actions/activity";

const useActivity = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.user);

  const trackSearch = useCallback((keyword) => {
    if (!isAuthenticated || !keyword) return Promise.resolve(null);
    return dispatch(storeSearchHistory(keyword));
  }, [dispatch, isAuthenticated]);

  const trackView = useCallback((productId) => {
    if (!isAuthenticated || !productId) return Promise.resolve(null);
    return dispatch(storeViewedProduct(productId));
  }, [dispatch, isAuthenticated]);

  const trackClick = useCallback((productId) => {
    if (!isAuthenticated || !productId) return Promise.resolve(null);
    return dispatch(storeClickedProduct(productId));
  }, [dispatch, isAuthenticated]);

  return { trackSearch, trackView, trackClick, isAuthenticated };
};

export default useActivity;
```

### 3. Integration Examples

#### Track Product View (ProductDetails.jsx)

```javascript
import useActivity from "../../hooks/useActivity";

const ProductDetails = ({ data }) => {
  const { trackView } = useActivity();
  const { isAuthenticated } = useSelector((state) => state.user);

  // Track product view when component mounts
  useEffect(() => {
    if (data?._id && isAuthenticated) {
      trackView(data._id);
    }
  }, [data?._id, isAuthenticated, trackView]);

  // ... rest of component
};
```

#### Track Product Click (ProductCard.jsx)

```javascript
import useActivity from "../../../hooks/useActivity";

const ProductCard = ({ data }) => {
  const { isAuthenticated, trackClick } = useActivity();

  const handleProductClick = () => {
    if (isAuthenticated && data?._id) {
      trackClick(data._id);
    }
  };

  return (
    <Link to={`/product/${data?._id}`} onClick={handleProductClick}>
      <img src={data.images[0]} alt={data.name} />
      <h4>{data.name}</h4>
    </Link>
  );
};
```

#### Track Search (SearchBar.jsx)

```javascript
import useActivity from "../../hooks/useActivity";

const SearchBar = () => {
  const { trackSearch } = useActivity();
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      trackSearch(searchTerm.trim());  // Track the search
      // ... perform actual search
    }
  };

  return (
    <form onSubmit={handleSearch}>
      <input 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
};
```

---

## Example MongoDB Documents

### Complete User Activity Document

```json
{
  "_id": ObjectId("650a1b2c3d4e5f6789012341"),
  "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
  "search_history": [
    {
      "keyword": "wireless headphones",
      "searched_at": ISODate("2024-01-15T10:30:00Z")
    },
    {
      "keyword": "laptop stand",
      "searched_at": ISODate("2024-01-16T14:45:00Z")
    },
    {
      "keyword": "mechanical keyboard",
      "searched_at": ISODate("2024-01-17T09:15:00Z")
    },
    {
      "keyword": "gaming mouse",
      "searched_at": ISODate("2024-01-18T11:20:00Z")
    }
  ],
  "clicked_products": [
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
      "clicked_at": ISODate("2024-01-15T10:35:00Z")
    },
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012351"),
      "clicked_at": ISODate("2024-01-16T14:50:00Z")
    },
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012352"),
      "clicked_at": ISODate("2024-01-17T09:20:00Z")
    }
  ],
  "viewed_products": [
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
      "viewed_at": ISODate("2024-01-15T10:36:00Z")
    },
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012351"),
      "viewed_at": ISODate("2024-01-16T14:55:00Z")
    },
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012352"),
      "viewed_at": ISODate("2024-01-17T09:25:00Z")
    },
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012353"),
      "viewed_at": ISODate("2024-01-18T11:25:00Z")
    }
  ],
  "last_updated": ISODate("2024-01-18T11:25:00Z"),
  "__v": 0
}
```

### Multiple User Activities (for Recommendation Analysis)

```json
[
  {
    "_id": ObjectId("650a1b2c3d4e5f6789012341"),
    "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
    "search_history": [
      { "keyword": "electronics", "searched_at": ISODate("2024-01-15T10:00:00Z") },
      { "keyword": "headphones", "searched_at": ISODate("2024-01-15T10:05:00Z") }
    ],
    "clicked_products": [
      { "product_id": ObjectId("...product1"), "clicked_at": ISODate("2024-01-15T10:10:00Z") }
    ],
    "viewed_products": [
      { "product_id": ObjectId("...product1"), "viewed_at": ISODate("2024-01-15T10:15:00Z") }
    ]
  },
  {
    "_id": ObjectId("650a1b2c3d4e5f6789012342"),
    "user_id": ObjectId("650a1b2c3d4e5f6789012341"),
    "search_history": [
      { "keyword": "laptop", "searched_at": ISODate("2024-01-15T11:00:00Z") },
      { "keyword": "gaming laptop", "searched_at": ISODate("2024-01-15T11:05:00Z") }
    ],
    "clicked_products": [
      { "product_id": ObjectId("...product2"), "clicked_at": ISODate("2024-01-15T11:10:00Z") }
    ],
    "viewed_products": [
      { "product_id": ObjectId("...product2"), "viewed_at": ISODate("2024-01-15T11:15:00Z") }
    ]
  }
]
```

---

## Data Analysis for Recommendation System

### Querying User Activity for Recommendations

```javascript
// Get user's search keywords (for content-based filtering)
const userSearchKeywords = await UserActivity.aggregate([
  { $match: { user_id: userId } },
  { $unwind: "$search_history" },
  { $group: { _id: "$search_history.keyword", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);

// Get most viewed products (for collaborative filtering)
const mostViewedProducts = await UserActivity.aggregate([
  { $unwind: "$viewed_products" },
  { $group: { 
    _id: "$viewed_products.product_id", 
    viewCount: { $sum: 1 } 
  }},
  { $sort: { viewCount: -1 } },
  { $limit: 10 }
]);

// Get users with similar interests (for collaborative filtering)
const similarUsers = await UserActivity.aggregate([
  { $match: { "search_history.keyword": "wireless headphones" } },
  { $group: { _id: "$user_id", matchingSearches: { $sum: 1 } } },
  { $sort: { matchingSearches: -1 } }
]);

// Get click-through rate per product
const clickThroughRate = await UserActivity.aggregate([
  { $unwind: "$clicked_products" },
  { $group: {
    _id: "$clicked_products.product_id",
    totalClicks: { $sum: 1 }
  }}
]);
```

### Combining with Orders for Purchase History

```javascript
// Get user's purchase history from orders collection
const purchaseHistory = await Order.find({ user: userId })
  .populate("cart.items.product")
  .sort({ createdAt: -1 });

// Combine activity data with purchase history for complete user profile
const userProfile = {
  searches: await UserActivity.findOne({ user_id: userId }).select("search_history"),
  views: await UserActivity.findOne({ user_id: userId }).select("viewed_products"),
  clicks: await UserActivity.findOne({ user_id: userId }).select("clicked_products"),
  purchases: purchaseHistory
};
```

---

## Key Features

1. **Automatic Upsert**: Documents are created automatically if they don't exist
2. **Non-blocking**: Activity tracking failures don't interrupt user experience
3. **Timestamped**: All activities include precise timestamps
4. **Authenticated**: Only logged-in users' activities are tracked
5. **Scalable**: Efficient indexing for quick queries

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/model/userActivity.js` | Mongoose schema definition |
| `backend/controller/activity.js` | API controller functions |
| `backend/routes/activityRoutes.js` | Express routes |
| `frontend/src/redux/actions/activity.js` | Redux actions |
| `frontend/src/hooks/useActivity.js` | Custom React hook |