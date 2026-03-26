/**
 * Analytics Controller
 * 
 * Provides analytics data for seller dashboard including:
 * - Total revenue, orders, products, customers
 * - Monthly revenue breakdown
 * - Top products by buyers
 * - Order status distribution
 */

const Order = require("../model/order");
const Product = require("../model/product");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");

/**
 * Get analytics data for a specific seller
 * Route: GET /api/analytics/:sellerId
 */
exports.getSellerAnalytics = catchAsyncErrors(async (req, res) => {
  const { sellerId } = req.params;

  if (!sellerId) {
    return res.status(400).json({
      success: false,
      message: "Seller ID is required"
    });
  }

  console.log(`[Analytics] Fetching analytics for seller: ${sellerId}`);

  // Get all products for this seller
  const sellerProducts = await Product.find({ shopId: sellerId }).lean();
  const productIds = sellerProducts.map(p => p._id.toString());
  const productNameMap = {};
  sellerProducts.forEach(p => {
    productNameMap[p._id.toString()] = p.name;
  });

  // Get all orders that contain seller's products
  const allOrders = await Order.find().lean();

  // Filter orders containing seller's products
  const sellerOrders = allOrders.filter(order => {
    return order.cart && order.cart.some(item => productIds.includes(item.productId?.toString() || item._id?.toString()));
  });

  // Calculate total revenue
  let totalRevenue = 0;
  const customerSet = new Set();
  const productBuyersMap = {};
  const monthlyRevenue = new Array(12).fill(0);
  const orderStatus = { delivered: 0, pending: 0, cancelled: 0 };

  // Current year for monthly filtering
  const currentYear = new Date().getFullYear();

  sellerOrders.forEach(order => {
    // Calculate revenue from seller's products in this order
    let orderSellerRevenue = 0;
    let orderProducts = [];

    order.cart.forEach(item => {
      const itemId = item.productId?.toString() || item._id?.toString();
      if (productIds.includes(itemId)) {
        const itemTotal = (item.discountPrice || item.originalPrice || 0) * (item.quantity || 1);
        orderSellerRevenue += itemTotal;
        orderProducts.push(itemId);

        // Track product buyers
        if (!productBuyersMap[itemId]) {
          productBuyersMap[itemId] = new Set();
        }
        if (order.user && order.user._id) {
          productBuyersMap[itemId].add(order.user._id.toString());
        }
      }
    });

    totalRevenue += orderSellerRevenue;

    // Track unique customers
    if (order.user && order.user._id) {
      customerSet.add(order.user._id.toString());
    }

    // Monthly revenue
    if (order.createdAt) {
      const orderDate = new Date(order.createdAt);
      if (orderDate.getFullYear() === currentYear) {
        const month = orderDate.getMonth();
        monthlyRevenue[month] += orderSellerRevenue;
      }
    }

    // Order status
    const status = (order.status || "Processing").toLowerCase();
    if (status === "delivered" || status === "completed") {
      orderStatus.delivered++;
    } else if (status === "cancelled" || status === "refunded") {
      orderStatus.cancelled++;
    } else {
      orderStatus.pending++;
    }
  });

  // Get top 10 products by buyers
  const productBuyers = Object.entries(productBuyersMap)
    .map(([productId, buyers]) => [productNameMap[productId] || "Unknown Product", buyers.size])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Build response
  const analyticsData = {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders: sellerOrders.length,
    totalProducts: sellerProducts.length,
    totalCustomers: customerSet.size,
    monthlyRevenue: monthlyRevenue.map(r => Math.round(r * 100) / 100),
    productBuyers,
    orderStatus
  };

  console.log(`[Analytics] Analytics calculated for seller ${sellerId}:`, {
    totalRevenue: analyticsData.totalRevenue,
    totalOrders: analyticsData.totalOrders,
    totalProducts: analyticsData.totalProducts
  });

  res.status(200).json({
    success: true,
    data: analyticsData
  });
});

/**
 * Get analytics summary for dashboard preview
 * Route: GET /api/analytics/:sellerId/summary
 */
exports.getAnalyticsSummary = catchAsyncErrors(async (req, res) => {
  const { sellerId } = req.params;

  if (!sellerId) {
    return res.status(400).json({
      success: false,
      message: "Seller ID is required"
    });
  }

  // Get total products count
  const totalProducts = await Product.countDocuments({ shopId: sellerId });

  // Get seller's product IDs
  const sellerProducts = await Product.find({ shopId: sellerId }, '_id').lean();
  const productIds = sellerProducts.map(p => p._id.toString());

  // Get orders count
  const allOrders = await Order.find().lean();
  const sellerOrders = allOrders.filter(order => 
    order.cart && order.cart.some(item => 
      productIds.includes(item.productId?.toString() || item._id?.toString())
    )
  );

  res.status(200).json({
    success: true,
    data: {
      totalOrders: sellerOrders.length,
      totalProducts
    }
  });
});