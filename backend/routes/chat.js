const express = require('express');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const { handleSellerAIQuery } = require('../services/sellerService');

const router = express.Router();

// Assume seller auth middleware exists - extracts req.user.shopId
const requireSellerAuth = (req, res, next) => {
  if (!req.user || !req.user.shopId) {
    return next(new ErrorHandler('Seller authentication required', 401));
  }
  req.sellerId = req.user.shopId;
  next();
};

/**
 * Seller AI Chat endpoint
 * POST /api/seller-ai/chat
 * Body: { message: string }
 * Headers: Authorization: Bearer <jwt>
 */
router.post('/chat', requireSellerAuth, catchAsyncErrors(async (req, res, next) => {
  const { message } = req.body;
  const sellerId = req.sellerId;

  if (!message) {
    return next(new ErrorHandler('Message is required', 400));
  }

  const result = await handleSellerAIQuery(message, sellerId);

  res.status(200).json(result);
}));

module.exports = router;

