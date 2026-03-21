const UserActivity = require("../model/userActivity");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

// Store search history when user searches in the search bar
exports.storeSearchHistory = catchAsyncErrors(async (req, res, next) => {
  const { keyword } = req.body;
  const userId = req.user._id;

  if (!keyword || keyword.trim() === "") {
    return next(new ErrorHandler("Search keyword is required", 400));
  }

  const trimmedKeyword = keyword.trim().toLowerCase();

  // Use findOneAndUpdate with $push and upsert
  const activity = await UserActivity.findOneAndUpdate(
    { user_id: userId },
    {
      $push: {
        search_history: {
          keyword: trimmedKeyword,
          searched_at: new Date(),
        },
      },
      $set: {
        last_updated: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  res.status(200).json({
    success: true,
    message: "Search history stored successfully",
    activity,
  });
});

// Store viewed product when the product page is opened
exports.storeViewedProduct = catchAsyncErrors(async (req, res, next) => {
  const { product_id } = req.body;
  const userId = req.user._id;

  if (!product_id) {
    return next(new ErrorHandler("Product ID is required", 400));
  }

  // Use findOneAndUpdate with $push and upsert
  const activity = await UserActivity.findOneAndUpdate(
    { user_id: userId },
    {
      $push: {
        viewed_products: {
          product_id: product_id,
          viewed_at: new Date(),
        },
      },
      $set: {
        last_updated: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  res.status(200).json({
    success: true,
    message: "Viewed product stored successfully",
    activity,
  });
});

// Store clicked product when the user clicks a product card
exports.storeClickedProduct = catchAsyncErrors(async (req, res, next) => {
  const { product_id } = req.body;
  const userId = req.user._id;

  if (!product_id) {
    return next(new ErrorHandler("Product ID is required", 400));
  }

  // Use findOneAndUpdate with $push and upsert
  const activity = await UserActivity.findOneAndUpdate(
    { user_id: userId },
    {
      $push: {
        clicked_products: {
          product_id: product_id,
          clicked_at: new Date(),
        },
      },
      $set: {
        last_updated: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  res.status(200).json({
    success: true,
    message: "Clicked product stored successfully",
    activity,
  });
});

// Get user activity for recommendation analysis
exports.getUserActivity = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  const activity = await UserActivity.findOne({ user_id: userId })
    .populate("viewed_products.product_id")
    .populate("clicked_products.product_id");

  if (!activity) {
    return res.status(200).json({
      success: true,
      activity: {
        user_id: userId,
        search_history: [],
        viewed_products: [],
        clicked_products: [],
      },
    });
  }

  res.status(200).json({
    success: true,
    activity,
  });
});

// Get all user activities for admin/recommendation system
exports.getAllUserActivities = catchAsyncErrors(async (req, res, next) => {
  const activities = await UserActivity.find()
    .populate("user_id", "name email")
    .populate("viewed_products.product_id", "name category")
    .populate("clicked_products.product_id", "name category")
    .sort({ last_updated: -1 });

  res.status(200).json({
    success: true,
    count: activities.length,
    activities,
  });
});

// Delete a specific search history item
exports.deleteSearchHistoryItem = catchAsyncErrors(async (req, res, next) => {
  const { keyword } = req.params;
  const userId = req.user._id;

  // Decode the keyword from URL encoding and convert to lowercase
  const decodedKeyword = decodeURIComponent(keyword).toLowerCase();

  const activity = await UserActivity.findOneAndUpdate(
    { user_id: userId },
    {
      $pull: {
        search_history: { keyword: decodedKeyword },
      },
      $set: {
        last_updated: new Date(),
      },
    },
    { new: true }
  );

  if (!activity) {
    return next(new ErrorHandler("Activity not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Search history item deleted successfully",
    activity,
  });
});

// Clear all search history for the user
exports.clearAllSearchHistory = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user._id;

  const activity = await UserActivity.findOneAndUpdate(
    { user_id: userId },
    {
      $set: {
        search_history: [],
        last_updated: new Date(),
      },
    },
    { new: true, upsert: true }
  );

  res.status(200).json({
    success: true,
    message: "All search history cleared successfully",
    activity,
  });
});
