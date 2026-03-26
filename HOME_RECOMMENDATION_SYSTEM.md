# Home Screen Recommendation System

## Overview

This document describes the complete home screen recommendation system for the e-commerce platform. The system uses **Additive Aggregation (ADD)** scoring to provide personalized product recommendations based on user activity.

## Table of Contents

1. [Collections Used](#collections-used)
2. [Scoring Algorithm](#scoring-algorithm)
3. [API Endpoints](#api-endpoints)
4. [How It Works](#how-it-works)
5. [Examples](#examples)
6. [Frontend Integration](#frontend-integration)
7. [Error Handling](#error-handling)
8. [Future Enhancements](#future-enhancements)

---

## Collections Used

### 1. `users_activity` Collection

```javascript
{
  "_id": ObjectId("..."),
  "user_id": ObjectId("..."),           // Reference to User
  "clicked_products": [
    {
      "product_id": ObjectId("..."),    // Reference to Product
      "clicked_at": ISODate("...")
    }
  ],
  "viewed_products": [
    {
      "product_id": ObjectId("..."),
      "viewed_at": ISODate("...")
    }
  ],
  "search_history": [
    {
      "keyword": "wireless headphones",
      "searched_at": ISODate("...")
    }
  ],
  "last_updated": ISODate("...")
}
```

### 2. `orders` Collection

```javascript
{
  "_id": ObjectId("..."),
  "user": {
    "_id": "user_id_string",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "cart": [
    {
      "productId": ObjectId("..."),     // Product reference
      "quantity": 2,
      "name": "Product Name",
      "price": 99.99
    }
  ],
  "status": "Delivered",
  "paidAt": ISODate("...")
}
```

### 3. `products` Collection

```javascript
{
  "_id": ObjectId("..."),
  "name": "Wireless Headphones",
  "category": "Electronics",
  "productType": "Audio",
  "tags": ["wireless", "bluetooth", "headphones"],
  "stock": 50,
  "sold_out": 120,
  "ratings": 4.5
}
```

---

## Scoring Algorithm

### ADD (Additive Aggregation) Method

The system uses weighted scoring to calculate user preference for each productType and category:

```
Score(productType) = (click_count × 3) + (order_count × 4)
Score(category) = (click_count × 3) + (order_count × 4)
```

### Weights

| Interaction | Weight | Reason |
|-------------|--------|--------|
| Click       | 3      | User showed interest by clicking on a product |
| Order       | 4      | Strongest signal - user purchased the product |

### Recommendation Priority Logic (NEW)

The system now prioritizes **productType** over category:

1. **PRIORITY 1**: Fetch ALL available products from the top-scored productType (excluding interacted)
2. **PRIORITY 2**: Fill remaining slots with popular items from same category (other productTypes)
3. **PRIORITY 3**: Fill any remaining slots with trending products from all categories

This ensures users see the most relevant products first based on their specific product type preferences.

### Example Calculation

**User Activity:**
- Clicked: Carrots (Vegetables/Grocery), Potatoes (Vegetables/Grocery), T-Shirt (Clothing/Apparel)
- Ordered: Tomatoes (Vegetables/Grocery), Jeans (Clothing/Apparel)

**ProductType Scores:**
```
Vegetables: (3 clicks × 3) + (1 order × 4) = 9 + 4 = 13
Apparel: (2 clicks × 3) + (1 order × 4) = 6 + 4 = 10
```

**Category Scores:**
```
Grocery: (3 clicks × 3) + (1 order × 4) = 13
Clothing: (2 clicks × 3) + (1 order × 4) = 10
```

**Top productType**: Vegetables (Score: 13)
**Top Category**: Grocery (Score: 13)

**Recommendation Distribution (20 items):**

| Priority | Source | Products | Count |
|----------|--------|----------|-------|
| 1 | Vegetables productType | Carrots, Potatoes, Tomatoes (excluded), Lettuce, Spinach, Cabbage... | 15 items |
| 2 | Grocery (other types: Fruits, Dairy) | Milk, Cheese, Apples, Bananas... | 5 items |
| 3 | Trending (if needed) | Popular products from all categories | 0 items (already filled) |

---

## API Endpoints

### 1. Get Home Recommendations (Primary Endpoint)

```
GET /api/v2/recommendations/home
```

**Authentication:** Required (Bearer token or session cookie)

**Query Parameters:**
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| count     | number | 20 | 50 | Number of recommendations |

**Response:**
```json
{
  "success": true,
  "message": "Personalized recommendations based on your activity!",
  "isPersonalized": true,
  "recommendations": [
    {
      "_id": "product_id",
      "name": "Product Name",
      "category": "Electronics",
      "discountPrice": 99.99,
      "images": ["url1", "url2"],
      "ratings": 4.5,
      "stock": 50
    }
  ],
  "count": 20,
  "metadata": {
    "totalRecommendations": 20,
    "isPersonalized": true,
    "message": "Personalized recommendations based on your activity!",
    "userInteractions": {
      "clicks": 8,
      "orders": 3
    },
    "categoryScores": {
      "Electronics": 23,
      "Clothing": 13
    },
    "distribution": {
      "Electronics": 13,
      "Clothing": 7
    },
    "weights": {
      "CLICK": 3,
      "ORDER": 4
    }
  }
}
```

### 2. Get Trending Products (Public)

```
GET /api/v2/recommendations/trending
```

**Authentication:** Not required

**Query Parameters:**
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| count     | number | 20 | 50 | Number of products |

**Response:**
```json
{
  "success": true,
  "message": "Trending products",
  "count": 20,
  "recommendations": [...]
}
```

### 3. Get Standard Recommendations (Legacy)

```
GET /api/v2/recommendations
```

Returns 10 products with basic personalization.

### 4. Get Quick Recommendations

```
GET /api/v2/recommendations/quick
```

Returns products without extensive metadata (lightweight).

---

## How It Works

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    getHomeRecommendations(userId)                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Fetch User's Clicked Products                          │
│  - Query users_activity collection                              │
│  - Extract product_ids from clicked_products array              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Fetch User's Ordered Products                          │
│  - Query orders collection                                      │
│  - Extract productIds from cart array                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Check if User Has Activity                             │
│  - If NO clicks AND NO orders → Return Trending Products        │
│  - If HAS activity → Continue to Step 4                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Map Products to Categories                             │
│  - Query products collection for interacted products            │
│  - Get category and productType for each product                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Calculate Category Scores (ADD Method)                 │
│  - For clicks: categoryScore += CLICK_WEIGHT (3)                │
│  - For orders: categoryScore += ORDER_WEIGHT (4)                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Sort Categories by Score (Descending)                  │
│  - Higher score = stronger preference                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: Calculate Proportional Distribution                    │
│  - Distribute total items based on score proportion             │
│  - Each category gets at least 1 item                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 8: Fetch Products per Category                            │
│  - Exclude already interacted products                          │
│  - Only include products with stock > 0                         │
│  - Sort by sold_out and ratings                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 9: Fill Gaps with Trending Products                       │
│  - If a category has fewer products than allocated              │
│  - Fill remaining slots with trending products                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 10: Shuffle for Diversity                                 │
│  - Use Fisher-Yates shuffle algorithm                           │
│  - Ensures varied product display each time                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 11: Return Recommendations with Metadata                  │
│  - Include category scores for transparency                     │
│  - Include distribution details for analytics                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Examples

### Example 1: User with Mixed Activity

**User Activity:**
- Clicked products: P1 (Electronics), P2 (Electronics), P3 (Clothing), P4 (Electronics), P5 (Clothing)
- Ordered products: P6 (Electronics), P7 (Clothing), P8 (Electronics)

**Score Calculation:**
```javascript
// Electronics
clicks: 3 products × 3 = 9
orders: 2 products × 4 = 8
Total: 17

// Clothing
clicks: 2 products × 3 = 6
orders: 1 product × 4 = 4
Total: 10

// Total Score: 27
// Electronics: 17/27 = 63% → 13 products
// Clothing: 10/27 = 37% → 7 products
```

**API Call:**
```bash
curl -X GET "http://localhost:5000/api/v2/recommendations/home?count=20" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Personalized recommendations based on your activity!",
  "isPersonalized": true,
  "count": 20,
  "recommendations": [
    { "_id": "p9", "name": "Smartphone", "category": "Electronics", ... },
    { "_id": "p10", "name": "T-Shirt", "category": "Clothing", ... },
    { "_id": "p11", "name": "Laptop", "category": "Electronics", ... },
    // ... 17 more products
  ],
  "metadata": {
    "categoryScores": { "Electronics": 17, "Clothing": 10 },
    "distribution": { "Electronics": 13, "Clothing": 7 },
    "userInteractions": { "clicks": 5, "orders": 3 },
    "weights": { "CLICK": 3, "ORDER": 4 }
  }
}
```

### Example 2: New User (No Activity)

**User Activity:** None (no clicks, no orders)

**API Call:**
```bash
curl -X GET "http://localhost:5000/api/v2/recommendations/home?count=20" \
  -H "Authorization: Bearer NEW_USER_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Trending products for you! Browse and shop to get personalized recommendations.",
  "isPersonalized": false,
  "count": 20,
  "recommendations": [
    // Trending products sorted by sold_out and ratings
  ],
  "metadata": {
    "totalRecommendations": 20,
    "isPersonalized": false,
    "message": "Trending products for you! Browse and shop to get personalized recommendations.",
    "categoryScores": {},
    "distribution": {}
  }
}
```

### Example 3: Guest User (Not Authenticated)

**API Call:**
```bash
curl -X GET "http://localhost:5000/api/v2/recommendations/trending?count=10"
```

**Response:**
```json
{
  "success": true,
  "message": "Trending products",
  "count": 10,
  "recommendations": [
    // Top 10 trending products
  ]
}
```

---

## Frontend Integration

### React Component Usage

```jsx
import RecommendedProducts from "./components/Route/RecommendedProducts/RecommendedProducts";

// In HomePage.jsx
const HomePage = () => {
  return (
    <div>
      {/* Other sections */}
      
      {/* Home Recommendations - Shows 20 products */}
      <RecommendedProducts count={20} />
      
      {/* Other sections */}
    </div>
  );
};
```

### Using Redux Actions

```jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getHomeRecommendations } from "../redux/actions/recommendation";

const CustomRecommendations = () => {
  const dispatch = useDispatch();
  const { recommendations, loading, metadata } = useSelector(
    (state) => state.recommendations
  );

  useEffect(() => {
    dispatch(getHomeRecommendations(30)); // Get 30 recommendations
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Recommended For You</h2>
      {metadata?.categoryScores && (
        <div>
          Top categories:
          {Object.entries(metadata.categoryScores).map(([cat, score]) => (
            <span key={cat}>{cat}: {score}</span>
          ))}
        </div>
      )}
      {/* Render products */}
    </div>
  );
};
```

---

## Error Handling

### Backend Error Scenarios

| Scenario | Behavior |
|----------|----------|
| User not found | Returns empty recommendations array |
| Database connection error | Returns graceful error message |
| Invalid userId | Returns 400 Bad Request |
| No products available | Returns empty array |

### Frontend Error Handling

```jsx
// The component handles errors gracefully
const RecommendedProducts = () => {
  const [error, setError] = useState(null);
  
  // ... fetch logic with try/catch
  
  if (error) {
    return (
      <div className="error-message">
        {error}
        <button onClick={retry}>Retry</button>
      </div>
    );
  }
};
```

---

## Future Enhancements

### Planned Features

1. **Search-Based Recommendations**
   - Add search weight to scoring algorithm
   - Score(category) = (clicks × 3) + (orders × 4) + (searches × 2)

2. **Wishlist Integration**
   - Track wishlist additions
   - Weight: 2 (between click and order)

3. **Time Decay**
   - Recent interactions weighted higher
   - Older interactions gradually lose weight

4. **Collaborative Filtering**
   - Find similar users based on behavior
   - Recommend products from similar users

5. **ProductType-Based Recommendations**
   - Already tracked in productTypeScores
   - Can be used for more granular recommendations

6. **A/B Testing**
   - Test different weight configurations
   - Measure click-through rates

### Extensibility

The system is designed to be easily extended:

```javascript
// Add new interaction type
const WEIGHTS = {
  CLICK: 3,
  ORDER: 4,
  WISHLIST: 2,    // New weight
  SEARCH: 2,      // New weight
  SHARE: 3        // New weight
};
```

---

## Testing

### Unit Test Examples

```javascript
// Test category score calculation
describe('getHomeRecommendations', () => {
  it('should calculate correct category scores', async () => {
    // Setup mock data
    const userId = 'test_user_id';
    
    const result = await getHomeRecommendations(userId, 20);
    
    expect(result.success).toBe(true);
    expect(result.recommendations.length).toBeLessThanOrEqual(20);
    expect(result.metadata.weights.CLICK).toBe(3);
    expect(result.metadata.weights.ORDER).toBe(4);
  });

  it('should return trending products for new users', async () => {
    const newUserId = 'new_user_with_no_activity';
    
    const result = await getHomeRecommendations(newUserId, 20);
    
    expect(result.metadata.isPersonalized).toBe(false);
  });
});
```

---

## Configuration

### Environment Variables

```bash
# Backend
MONGODB_URI=mongodb://localhost:27017/sigmastore
PORT=5000

# Frontend
VITE_SERVER_URL=http://localhost:5000
```

### Recommendation Settings

```javascript
// In backend/utils/recommendation.js
const WEIGHTS = {
  CLICK: 3,    // Adjust based on A/B testing
  ORDER: 4,    // Higher weight for purchases
};

const DEFAULT_RECOMMENDATION_COUNT = 20;  // Default products to return
const MIN_STOCK_THRESHOLD = 0;            // Minimum stock required
```

---

## Summary

The Home Screen Recommendation System provides personalized product recommendations using the ADD (Additive Aggregation) scoring algorithm. It:

1. ✅ Tracks user clicks and orders
2. ✅ Calculates weighted category scores
3. ✅ Distributes recommendations proportionally
4. ✅ Excludes already interacted products
5. ✅ Shuffles results for diversity
6. ✅ Falls back to trending products for new users
7. ✅ Provides detailed metadata for analytics
8. ✅ Handles errors gracefully

The system is production-ready, well-documented, and easily extensible for future enhancements.