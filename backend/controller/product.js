const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../model/product");
const Order = require("../model/order");
const Shop = require("../model/shop");
const { upload, uploadToCloudinary } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const { searchProducts, searchProductNames } = require("../utils/productSearch");
const axios = require("axios");
const FormData = require("form-data");
const { buildPrompt, parseAIResponse, validateRequest } = require("../utils/promptBuilder");

// create product
router.post(
  "/create-product",
  upload.array("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.body.shopId;
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      } else {
        const files = req.files;
        // Upload each image to Cloudinary manually
        const imageUrls = [];
        if (files && files.length > 0) {
          for (const file of files) {
            const result = await uploadToCloudinary(file.buffer);
            imageUrls.push(result.secure_url);
          }
        }

        // Build product data object
        const productData = {
          name: req.body.name,
          description: req.body.description,
          category: req.body.category,
          originalPrice: Number(req.body.originalPrice),
          discountPrice: Number(req.body.discountPrice),
          stock: Number(req.body.stock),
          shopId: req.body.shopId,
          shop: shop,
          images: imageUrls,
        };

        // Handle optional fields - only add if they have valid values
        if (req.body.productType && req.body.productType.trim() !== '') {
          productData.productType = req.body.productType.trim();
        }

        if (req.body.brand && req.body.brand.trim() !== '') {
          productData.brand = req.body.brand.trim();
        }

        if (req.body.unit && req.body.unit.trim() !== '') {
          productData.unit = req.body.unit.trim();
        }

        // Parse tags if it's a JSON string
        if (req.body.tags) {
          try {
            const parsedTags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
            if (Array.isArray(parsedTags) && parsedTags.length > 0) {
              productData.tags = parsedTags;
            }
          } catch (e) {
            // If not valid JSON, split by comma as fallback
            const tagsArray = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            if (tagsArray.length > 0) {
              productData.tags = tagsArray;
            }
          }
        }

        // Convert expiryDate to Date object if provided
        if (req.body.expiryDate && req.body.expiryDate.trim() !== '') {
          productData.expiryDate = new Date(req.body.expiryDate);
        }

        const product = await Product.create(productData);

        res.status(201).json({
          success: true,
          product,
        });
      }
    } catch (error) {
      console.error("Error creating product:", error);
      return next(new ErrorHandler(error.message || error, 400));
    }
  })
);

// get all products of a shop
router.get(
  "/get-all-products-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find({ shopId: req.params.id });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete product of a shop
router.delete(
  "/delete-shop-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;

      // Find and delete the product - Cloudinary handles image cleanup automatically
      const product = await Product.findByIdAndDelete(productId);

      if (!product) {
        return next(new ErrorHandler("Product not found with this id!", 500));
      }

      res.status(201).json({
        success: true,
        message: "Product Deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all products
router.get(
  "/get-all-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// review for a product
router.put(
  "/create-new-review",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { user, rating, comment, productId, orderId } = req.body;

      const product = await Product.findById(productId);

      const review = {
        user,
        rating,
        comment,
        productId,
      };

      const isReviewed = product.reviews.find(
        (rev) => rev.user._id === req.user._id
      );

      if (isReviewed) {
        product.reviews.forEach((rev) => {
          if (rev.user._id === req.user._id) {
            (rev.rating = rating), (rev.comment = comment), (rev.user = user);
          }
        });
      } else {
        product.reviews.push(review);
      }

      let avg = 0;

      product.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      product.ratings = avg / product.reviews.length;

      await product.save({ validateBeforeSave: false });

      await Order.findByIdAndUpdate(
        orderId,
        { $set: { "cart.$[elem].isReviewed": true } },
        { arrayFilters: [{ "elem._id": productId }], new: true }
      );

      res.status(200).json({
        success: true,
        message: "Reviwed succesfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// all products --- for admin
router.get(
  "/admin-all-products",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Search products with text search and filters
router.get(
  "/search",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { q: query, category, minPrice, maxPrice, limit } = req.query;

      if (!query) {
        return next(new ErrorHandler("Search query is required", 400));
      }

      // Build filters object
      const filters = {};
      if (category) filters.category = category;
      if (minPrice) filters.minPrice = Number(minPrice);
      if (maxPrice) filters.maxPrice = Number(maxPrice);

      const products = await searchProducts(query, filters, Number(limit) || 20);

      res.status(200).json({
        success: true,
        count: products.length,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get product name suggestions for autocomplete
router.get(
  "/search-suggestions",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { q: query, limit } = req.query;

      if (!query) {
        return next(new ErrorHandler("Search query is required", 400));
      }

      const suggestions = await searchProductNames(query, Number(limit) || 10);

      res.status(200).json({
        success: true,
        suggestions,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Test endpoint for debugging
router.get(
  "/test",
  catchAsyncErrors(async (req, res, next) => {
    res.status(200).json({
      success: true,
      message: "Product API is working!",
      timestamp: new Date().toISOString()
    });
  })
);

// Generate product data using OpenRouter AI with dynamic prompt builder
// Supports modes: 'all', 'title', 'description', 'tags', 'brand'
router.post(
  "/generate-product",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { mode = 'all', imageUrl, category, productType } = req.body;

      console.log("[Generate Product] Received request:", { mode, imageUrl, category, productType });

      // Validate request parameters
      const validation = validateRequest({ mode, imageUrl });
      if (!validation.valid) {
        return next(new ErrorHandler(validation.error, 400));
      }

      // Call OpenRouter API
      const openRouterApiKey = process.env.OPENROUTER_API_KEY;

      if (!openRouterApiKey) {
        console.error("[Generate Product] OPENROUTER_API_KEY not found in environment");
        return next(new ErrorHandler("OpenRouter API key not configured", 500));
      }

      // Build dynamic prompt using the prompt builder
      const prompt = buildPrompt({ mode, category, productType, imageUrl });
      console.log("[Generate Product] Built prompt for mode:", mode);

      console.log("[Generate Product] Calling OpenRouter API...");

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ]
        },
        {
          headers: {
            "Authorization": `Bearer ${openRouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "SigmaStore Product Generator"
          },
          timeout: 60000
        }
      );

      console.log("[Generate Product] OpenRouter response received");

      // Extract the content from the response
      const content = response.data.choices[0].message.content;
      console.log("[Generate Product] Raw AI content:", content);

      // Parse and validate the AI response using prompt builder
      const productData = parseAIResponse(content, mode);
      console.log("[Generate Product] Parsed product data:", productData);

      res.status(200).json({
        success: true,
        mode,
        data: productData
      });
    } catch (error) {
      console.error("[Generate Product] Error:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status
      });
      return next(new ErrorHandler(error.message || "Failed to generate product data", 500));
    }
  })
);

// Generate title and description using AI
router.post(
  "/generate-title-description",
  upload.single("image"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new ErrorHandler("No image file provided", 400));
      }

      // Upload image to Cloudinary first
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer);
      const imageUrl = cloudinaryResult.secure_url;

      // Send image to Python Flask server for AI processing
      const pythonServerUrl = process.env.FLASK_ML_SERVICE_URL || "http://localhost:5000";

      // Create FormData with the image buffer
      // const formData = new FormData();
      // formData.append('image', req.file.buffer, {
      //   filename: req.file.originalname,
      //   contentType: req.file.mimetype,
      //   knownLength: req.file.buffer.length
      // });

      // const response = await axios.post(`${pythonServerUrl}/generate-title-and-description`, formData, {
      //   headers: {
      //     ...formData.getHeaders(),
      //   },
      //   maxContentLength: Infinity,
      //   maxBodyLength: Infinity,
      // });
      const response = await axios.post(`${pythonServerUrl}/generate-title-and-description`,
        {
          image_url: imageUrl
        },
        {
          headers: {
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      );
      res.status(200).json({
        success: true,
        title: response.data.title,
        description: response.data.description,
        imageUrl: imageUrl,
      });
    } catch (error) {
      console.error("Error generating title and description:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config ? {
          url: error.config.url,
          method: error.config.method,
          headers: error.config.headers
        } : null
      });
      return next(new ErrorHandler(error.message || "Failed to generate title and description", 500));
    }
  })
);

// Remove background from product image
router.post(
  "/remove-background",
  upload.single("image"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new ErrorHandler("No image file provided", 400));
      }

      // Send image directly to Python Flask server for background removal
      const pythonServerUrl = process.env.FLASK_ML_SERVICE_URL || "http://localhost:5000";

      // Create FormData with the image buffer
      const formData = new FormData();
      formData.append('image', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        knownLength: req.file.buffer.length
      });

      const response = await axios.post(`${pythonServerUrl}/remove-background`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000,
        responseType: 'arraybuffer' // Get binary response
      });

      // Upload the processed image to Cloudinary
      const processedImageBuffer = Buffer.from(response.data);
      const cloudinaryResult = await uploadToCloudinary(processedImageBuffer, "bg_removed_products");
      const processedImageUrl = cloudinaryResult.secure_url;

      // Return the Cloudinary URL instead of binary data
      res.status(200).json({
        success: true,
        imageUrl: processedImageUrl,
        message: "Background removed successfully!"
      });
    } catch (error) {
      console.error("Error removing background:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config ? {
          url: error.config.url,
          method: error.config.method,
          headers: error.config.headers
        } : null
      });
      return next(new ErrorHandler(error.message || "Failed to remove background", 500));
    }
  })
);

module.exports = router;
