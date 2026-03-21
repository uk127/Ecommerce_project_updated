# Recommendation System - Mongoose Schemas and Example Documents

This document provides a comprehensive overview of all the new Mongoose schemas created for the recommendation system, along with example MongoDB documents.

## Collections Overview

| Collection | Model Name | Purpose |
|------------|------------|---------|
| `useractivities` | UserActivity | Stores user search history and interactions |
| `productviews` | ProductViews | Stores every product view event |
| `productratings` | ProductRatings | Stores ratings and reviews for collaborative filtering |
| `recommendationlogs` | RecommendationLogs | Stores products recommended to users |
| `productsimilarities` | ProductSimilarity | Stores similar products for content-based recommendation |
| `groups` | Groups | Used for group recommender systems |
| `groupratings` | GroupRatings | Stores ratings given by group members to products |

---

## 1. UserActivity Collection

### Schema Definition

```javascript
{
  user_id: ObjectId (ref: "User", required),
  search_history: [
    {
      keyword: String (required),
      searched_at: Date (default: Date.now)
    }
  ],
  clicked_products: [ObjectId] (ref: "Product"),
  viewed_products: [ObjectId] (ref: "Product"),
  last_updated: Date (default: Date.now)
}
```

### Example Document

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
    }
  ],
  "clicked_products": [
    ObjectId("650a1b2c3d4e5f6789012350"),
    ObjectId("650a1b2c3d4e5f6789012351")
  ],
  "viewed_products": [
    ObjectId("650a1b2c3d4e5f6789012350"),
    ObjectId("650a1b2c3d4e5f6789012352"),
    ObjectId("650a1b2c3d4e5f6789012353")
  ],
  "last_updated": ISODate("2024-01-17T10:00:00Z"),
  "__v": 0
}
```

---

## 2. ProductViews Collection

### Schema Definition

```javascript
{
  user_id: ObjectId (ref: "User", required),
  product_id: ObjectId (ref: "Product", required),
  viewed_at: Date (default: Date.now)
}
```

### Example Document

```json
{
  "_id": ObjectId("650a1b2c3d4e5f6789012342"),
  "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
  "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
  "viewed_at": ISODate("2024-01-16T14:30:00Z"),
  "__v": 0
}
```

### Multiple View Events Example

```json
[
  {
    "_id": ObjectId("650a1b2c3d4e5f6789012342"),
    "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
    "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
    "viewed_at": ISODate("2024-01-16T14:30:00Z")
  },
  {
    "_id": ObjectId("650a1b2c3d4e5f6789012343"),
    "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
    "product_id": ObjectId("650a1b2c3d4e5f6789012351"),
    "viewed_at": ISODate("2024-01-16T14:35:00Z")
  },
  {
    "_id": ObjectId("650a1b2c3d4e5f6789012344"),
    "user_id": ObjectId("650a1b2c3d4e5f6789012341"),
    "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
    "viewed_at": ISODate("2024-01-16T15:00:00Z")
  }
]
```

---

## 3. ProductRatings Collection

### Schema Definition

```javascript
{
  user_id: ObjectId (ref: "User", required),
  product_id: ObjectId (ref: "Product", required),
  rating: Number (required, min: 1, max: 5),
  review: String (default: ""),
  created_at: Date (default: Date.now)
}
```

### Example Document

```json
{
  "_id": ObjectId("650a1b2c3d4e5f6789012343"),
  "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
  "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
  "rating": 4,
  "review": "Great product! Good quality and fast delivery. Would recommend to others.",
  "created_at": ISODate("2024-01-16T15:30:00Z"),
  "__v": 0
}
```

### Multiple Ratings Example

```json
[
  {
    "_id": ObjectId("650a1b2c3d4e5f6789012350"),
    "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
    "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
    "rating": 5,
    "review": "Excellent quality!",
    "created_at": ISODate("2024-01-15T10:00:00Z")
  },
  {
    "_id": ObjectId("650a1b2c3d4e5f6789012351"),
    "user_id": ObjectId("650a1b2c3d4e5f6789012341"),
    "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
    "rating": 4,
    "review": "Good value for money",
    "created_at": ISODate("2024-01-15T11:00:00Z")
  },
  {
    "_id": ObjectId("650a1b2c3d4e5f6789012352"),
    "user_id": ObjectId("650a1b2c3d4e5f6789012342"),
    "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
    "rating": 3,
    "review": "Average product",
    "created_at": ISODate("2024-01-15T12:00:00Z")
  }
]
```

---

## 4. RecommendationLogs Collection

### Schema Definition

```javascript
{
  user_id: ObjectId (ref: "User", required),
  recommended_products: [ObjectId] (ref: "Product"),
  algorithm_used: String (required, enum: ["collaborative", "content-based", "hybrid", "trending", "personalized"]),
  generated_at: Date (default: Date.now)
}
```

### Example Document

```json
{
  "_id": ObjectId("650a1b2c3d4e5f6789012344"),
  "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
  "recommended_products": [
    ObjectId("650a1b2c3d4e5f6789012350"),
    ObjectId("650a1b2c3d4e5f6789012351"),
    ObjectId("650a1b2c3d4e5f6789012352"),
    ObjectId("650a1b2c3d4e5f6789012353"),
    ObjectId("650a1b2c3d4e5f6789012354")
  ],
  "algorithm_used": "hybrid",
  "generated_at": ISODate("2024-01-16T16:00:00Z"),
  "__v": 0
}
```

---

## 5. ProductSimilarity Collection

### Schema Definition

```javascript
{
  product_id: ObjectId (ref: "Product", required),
  similar_products: [
    {
      product_id: ObjectId (ref: "Product", required),
      similarity_score: Number (required, min: 0, max: 1)
    }
  ],
  last_updated: Date (default: Date.now)
}
```

### Example Document

```json
{
  "_id": ObjectId("650a1b2c3d4e5f6789012345"),
  "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
  "similar_products": [
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012351"),
      "similarity_score": 0.95
    },
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012352"),
      "similarity_score": 0.87
    },
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012353"),
      "similarity_score": 0.82
    },
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012354"),
      "similarity_score": 0.75
    },
    {
      "product_id": ObjectId("650a1b2c3d4e5f6789012355"),
      "similarity_score": 0.68
    }
  ],
  "last_updated": ISODate("2024-01-16T17:00:00Z"),
  "__v": 0
}
```

---

## 6. Groups Collection

### Schema Definition

```javascript
{
  group_name: String (required, trimmed),
  members: [ObjectId] (ref: "User", required),
  created_at: Date (default: Date.now)
}
```

### Example Document

```json
{
  "_id": ObjectId("650a1b2c3d4e5f6789012346"),
  "group_name": "Family Shopping Group",
  "members": [
    ObjectId("650a1b2c3d4e5f6789012340"),
    ObjectId("650a1b2c3d4e5f6789012341"),
    ObjectId("650a1b2c3d4e5f6789012342")
  ],
  "created_at": ISODate("2024-01-16T18:00:00Z"),
  "__v": 0
}
```

### Multiple Groups Example

```json
[
  {
    "_id": ObjectId("650a1b2c3d4e5f6789012346"),
    "group_name": "Family Shopping Group",
    "members": [
      ObjectId("650a1b2c3d4e5f6789012340"),
      ObjectId("650a1b2c3d4e5f6789012341")
    ],
    "created_at": ISODate("2024-01-16T18:00:00Z")
  },
  {
    "_id": ObjectId("650a1b2c3d4e5f6789012347"),
    "group_name": "Office Supplies Team",
    "members": [
      ObjectId("650a1b2c3d4e5f6789012342"),
      ObjectId("650a1b2c3d4e5f6789012343"),
      ObjectId("650a1b2c3d4e5f6789012344")
    ],
    "created_at": ISODate("2024-01-17T09:00:00Z")
  }
]
```

---

## 7. GroupRatings Collection

### Schema Definition

```javascript
{
  group_id: ObjectId (ref: "Groups", required),
  product_id: ObjectId (ref: "Product", required),
  ratings: [
    {
      user_id: ObjectId (ref: "User", required),
      rating: Number (required, min: 1, max: 5)
    }
  ],
  created_at: Date (default: Date.now)
}
```

### Example Document

```json
{
  "_id": ObjectId("650a1b2c3d4e5f6789012347"),
  "group_id": ObjectId("650a1b2c3d4e5f6789012346"),
  "product_id": ObjectId("650a1b2c3d4e5f6789012350"),
  "ratings": [
    {
      "user_id": ObjectId("650a1b2c3d4e5f6789012340"),
      "rating": 5
    },
    {
      "user_id": ObjectId("650a1b2c3d4e5f6789012341"),
      "rating": 4
    },
    {
      "user_id": ObjectId("650a1b2c3d4e5f6789012342"),
      "rating": 4
    }
  ],
  "created_at": ISODate("2024-01-16T19:00:00Z"),
  "__v": 0
}
```

---

## Indexes Created

| Collection | Index | Type |
|------------|-------|------|
| useractivities | `user_id` | Single |
| productviews | `user_id, product_id` | Compound |
| productviews | `viewed_at` | Single (descending) |
| productratings | `user_id, product_id` | Compound (unique) |
| productratings | `product_id` | Single |
| recommendationlogs | `user_id, generated_at` | Compound |
| recommendationlogs | `algorithm_used` | Single |
| productsimilarities | `product_id` | Single (unique) |
| groups | `members` | Single |
| groupratings | `group_id, product_id` | Compound (unique) |

---

## Usage Examples

### Importing Models

```javascript
const UserActivity = require("./model/userActivity");
const ProductViews = require("./model/productViews");
const ProductRatings = require("./model/productRatings");
const RecommendationLogs = require("./model/recommendationLogs");
const ProductSimilarity = require("./model/productSimilarity");
const Groups = require("./model/groups");
const GroupRatings = require("./model/groupRatings");
```

### Creating a User Activity Record

```javascript
const activity = await UserActivity.create({
  user_id: userId,
  search_history: [{ keyword: "wireless headphones" }],
  clicked_products: [productId1, productId2],
  viewed_products: [productId1, productId2, productId3]
});
```

### Recording a Product View

```javascript
await ProductViews.create({
  user_id: userId,
  product_id: productId
});
```

### Adding a Rating

```javascript
await ProductRatings.create({
  user_id: userId,
  product_id: productId,
  rating: 4,
  review: "Great product!"
});
```

### Logging Recommendations

```javascript
await RecommendationLogs.create({
  user_id: userId,
  recommended_products: [product1, product2, product3],
  algorithm_used: "hybrid"
});
```

### Creating a Group

```javascript
const group = await Groups.create({
  group_name: "Family Shopping",
  members: [user1, user2, user3]
});
```

### Adding Group Ratings

```javascript
await GroupRatings.create({
  group_id: groupId,
  product_id: productId,
  ratings: [
    { user_id: user1, rating: 5 },
    { user_id: user2, rating: 4 }
  ]
});