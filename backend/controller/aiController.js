const express = require("express");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { classifyIntent, generateFinalResponse } = require("../services/aiService");
const { handleIntent } = require("../services/sellerService");

// Main function encapsulating pipeline
async function handleSellerAI(message, sellerId) {
  if (!sellerId) {
    throw new Error("Missing sellerId");
  }

  // 1. LLM Intent Classification
  let intentData;
  try {
    intentData = await classifyIntent(message);
  } catch (err) {
    console.error("AI Service Error:", err);
    throw new Error("AI understanding service failed. Please try again.");
  }

  // 8. FALLBACK HANDLING
  if (!intentData || intentData.intent === "fallback" || intentData.confidence < 0.6) {
    return {
      success: true,
      intent: intentData?.intent || "unknown",
      message: "I didn’t understand. Try asking about sales, products, or stock.",
      data: {}
    };
  }

  // 2. Intent Routing & MongoDB Execution
  let data;
  try {
    data = await handleIntent(intentData, sellerId);
  } catch (err) {
    if (err.message.includes("Unsupported intent")) {
      return {
        success: true,
        intent: "unknown",
        message: "I cannot assist with that specific request. Try asking about your sales, top products, or low stock items.",
        data: {}
      };
    }
    console.error("DB Query Error:", err);
    throw new Error("Database service failed.");
  }

  const { responseType = "detailed", limit = 5, sortBy = "quantity" } = intentData.entities || {};

  // 7. SHORT-CIRCUIT (VERY IMPORTANT)
  if (responseType === "short") {
    let responseMessage = "";
    if (intentData.intent === "get_sales_summary") {
      responseMessage = `Your sales summary for ${intentData.entities?.timeRange || "today"}: Revenue: ₹${data.totalRevenue || 0}, Orders: ${data.totalOrders || 0}.`;
      return { success: true, intent: intentData.intent, message: responseMessage, data };
    } else if (intentData.intent === "get_top_products") {
      if (Array.isArray(data) && data.length > 0) {
        const topProduct = data[0];
        responseMessage = `Your top product is ${topProduct.name} with ${sortBy === 'revenue' ? `₹${topProduct.revenue}` : `${topProduct.soldOut} units`} sold.`;
      } else {
        responseMessage = "You don't have any product sales for this period.";
      }
      return { success: true, intent: intentData.intent, message: responseMessage, data };
    } else if (intentData.intent === "get_low_stock") {
      responseMessage = Array.isArray(data) && data.length > 0 
        ? `You have ${data.length} products low in stock. Please restock soon.` 
        : "Great! All your products have sufficient stock.";
      return { success: true, intent: intentData.intent, message: responseMessage, data };
    }
  }

  // 5. TOKEN OPTIMIZATION
  // Compress data before sending to AI
  let compressedData = data;
  if (Array.isArray(data)) {
    // Top products or low stock
    compressedData = data.slice(0, limit).map(item => ({
      name: item.name,
      sold: item.soldOut || 0,
      revenue: item.revenue || (item.discountPrice * (item.soldOut || 0)),
      stock: item.stock
    }));
  } else if (data && typeof data === 'object') {
    // Sales summary
    compressedData = {
      totalRevenue: data.totalRevenue || 0,
      totalOrders: data.totalOrders || 0,
    };
  }

  // Generate Answer + Insights + Recommendations in ONE call
  let finalMessage;
  try {
    finalMessage = await generateFinalResponse(message, compressedData, intentData.entities);
  } catch (err) {
    console.error("AI Response Generation Error:", err);
    finalMessage = "Here is the requested information. AI insights are currently unavailable.";
  }

  // 9. OUTPUT FORMAT
  return {
    success: true,
    intent: intentData.intent,
    message: finalMessage,
    data: data
  };
}

// Controller function export
exports.processSellerAIRequest = catchAsyncErrors(async (req, res, next) => {
  const { message, sellerId } = req.body;

  if (!message || !sellerId) {
    return next(new ErrorHandler("Message and sellerId are required", 400));
  }

  try {
    const response = await handleSellerAI(message, sellerId);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process request"
    });
  }
});
