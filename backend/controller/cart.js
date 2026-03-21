const express = require("express");
const mongoose = require("mongoose");
const Cart = require("../model/cart");
const Product = require("../model/product");
const { isAuthenticated } = require("../middleware/auth");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

const router = express.Router();

/**
 * Add item to cart
 * POST /api/v2/cart/add
 */
router.post(
  "/add",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { productId, quantity } = req.body;

      if (!productId || !quantity) {
        return next(new ErrorHandler("Product ID and quantity are required", 400));
      }

      // Validate productId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return next(new ErrorHandler("Invalid product ID", 400));
      }

      // Verify product exists
      const product = await Product.findById(productId);
      if (!product) {
        return next(new ErrorHandler("Product not found", 404));
      }

      let cart = await Cart.findOne({ userId });

      if (!cart) {
        // Create new cart
        cart = new Cart({
          userId,
          items: [{ productId: new mongoose.Types.ObjectId(productId), quantity }],
        });
      } else {
        // Check if product already in cart
        const existingItemIndex = cart.items.findIndex(
          (item) => item.productId && item.productId.toString() === productId
        );

        if (existingItemIndex > -1) {
          // Update quantity
          cart.items[existingItemIndex].quantity += quantity;
        } else {
          // Add new item
          cart.items.push({ productId: new mongoose.Types.ObjectId(productId), quantity });
        }
      }

      cart.updatedAt = Date.now();
      await cart.save();

      // Populate product details
      await cart.populate({
        path: "items.productId",
        select: "name discountPrice originalPrice stock images shop shopId",
      });

      res.status(200).json({
        success: true,
        message: "Item added to cart successfully",
        cart,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

/**
 * Get user's cart
 * GET /api/v2/cart
 */
router.get(
  "/",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;

      let cart = await Cart.findOne({ userId }).populate({
        path: "items.productId",
        select: "name discountPrice originalPrice stock images shop shopId",
      });

      if (!cart) {
        return res.status(200).json({
          success: true,
          cart: { items: [] },
        });
      }

      res.status(200).json({
        success: true,
        cart,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

/**
 * Update cart item quantity
 * PUT /api/v2/cart/update
 */
router.put(
  "/update",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { productId, quantity } = req.body;

      if (!productId || quantity === undefined) {
        return next(new ErrorHandler("Product ID and quantity are required", 400));
      }

      let cart = await Cart.findOne({ userId });

      if (!cart) {
        return next(new ErrorHandler("Cart not found", 404));
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.productId && item.productId.toString() === productId
      );

      if (itemIndex === -1) {
        return next(new ErrorHandler("Item not found in cart", 404));
      }

      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        cart.items.splice(itemIndex, 1);
      } else {
        // Update quantity
        cart.items[itemIndex].quantity = quantity;
      }

      cart.updatedAt = Date.now();
      await cart.save();

      await cart.populate({
        path: "items.productId",
        select: "name discountPrice originalPrice stock images shop shopId",
      });

      res.status(200).json({
        success: true,
        message: "Cart updated successfully",
        cart,
      });
    } catch (error) {
      console.error("Error updating cart:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

/**
 * Remove item from cart
 * DELETE /api/v2/cart/remove/:productId
 */
router.delete(
  "/remove/:productId",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { productId } = req.params;

      let cart = await Cart.findOne({ userId });

      if (!cart) {
        return next(new ErrorHandler("Cart not found", 404));
      }

      cart.items = cart.items.filter(
        (item) => item.productId && item.productId.toString() !== productId
      );

      cart.updatedAt = Date.now();
      await cart.save();

      await cart.populate({
        path: "items.productId",
        select: "name discountPrice originalPrice stock images shop shopId",
      });

      res.status(200).json({
        success: true,
        message: "Item removed from cart",
        cart,
      });
    } catch (error) {
      console.error("Error removing from cart:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

/**
 * Clear entire cart
 * DELETE /api/v2/cart/clear
 */
router.delete(
  "/clear",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;

      await Cart.findOneAndDelete({ userId });

      res.status(200).json({
        success: true,
        message: "Cart cleared successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

/**
 * Merge local cart with database cart (for login)
 * POST /api/v2/cart/merge
 */
router.post(
  "/merge",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { items } = req.body; // Array of { productId, quantity }

      if (!items || !Array.isArray(items)) {
        return res.status(200).json({
          success: true,
          message: "No items to merge",
          cart: { items: [] },
        });
      }

      let cart = await Cart.findOne({ userId });

      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }

      // Filter and validate items before merging
      const validItems = items.filter(item => 
        item.productId && 
        mongoose.Types.ObjectId.isValid(item.productId) &&
        item.quantity && 
        item.quantity > 0
      );

      // Merge items
      for (const item of validItems) {
        const existingItemIndex = cart.items.findIndex(
          (cartItem) => cartItem.productId && cartItem.productId.toString() === item.productId
        );

        if (existingItemIndex > -1) {
          // Add to existing quantity
          cart.items[existingItemIndex].quantity += item.quantity;
        } else {
          // Add new item with proper ObjectId
          cart.items.push({ 
            productId: new mongoose.Types.ObjectId(item.productId), 
            quantity: item.quantity 
          });
        }
      }

      cart.updatedAt = Date.now();
      await cart.save();

      await cart.populate({
        path: "items.productId",
        select: "name discountPrice originalPrice stock images shop shopId",
      });

      res.status(200).json({
        success: true,
        message: "Cart merged successfully",
        cart,
      });
    } catch (error) {
      console.error("Error merging cart:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;