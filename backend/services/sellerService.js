// const Order = require("../model/order");
// const Product = require("../model/product");

// async function getSalesSummary(sellerId) {
//   // First, find all products owned by this seller
//   const sellerProducts = await Product.find({ shopId: sellerId }).select("_id").lean();
//   const productIds = sellerProducts.map(p => p._id.toString());

//   // Get all orders
//   const allOrders = await Order.find().lean();

//   // Filter orders containing seller's products
//   const sellerOrders = allOrders.filter(order => {
//     return order.cart && order.cart.some(item => {
//       const itemId = item.productId?.toString() || item._id?.toString();
//       return productIds.includes(itemId);
//     });
//   });

// const now = new Date();

// const todayStart = new Date(now);
// todayStart.setHours(0, 0, 0, 0);

// const weekStart = new Date(now);
// weekStart.setDate(weekStart.getDate() - 7);

// const monthStart = new Date(now);
// monthStart.setDate(monthStart.getDate() - 30);
//   // const now = new Date();
//   // const todayStart = new Date(now).setHours(0, 0, 0, 0);
//   // const weekStart = new Date(now).setDate(now.getDate() - 7);
//   // const monthStart = new Date(now).setDate(now.getDate() - 30);

//   let totalSales = 0;
//   let todaySales = 0;
//   let weekSales = 0;
//   let monthSales = 0;

//   let totalOrders = sellerOrders.length;
//   let todayOrders = 0;
//   let weekOrders = 0;
//   let monthOrders = 0;

//   for (const order of sellerOrders) {
//     let orderSellerRevenue = 0;

//     if (order.cart) {
//       order.cart.forEach(item => {
//         const itemId = item.productId?.toString() || item._id?.toString();
//         if (productIds.includes(itemId)) {
//           const itemTotal = (item.discountPrice || item.originalPrice || 0) * (item.quantity || item.qty || 1);
//           orderSellerRevenue += itemTotal;
//         }
//       });
//     }

//     totalSales += orderSellerRevenue;

//     if (order.createdAt) {
//       const orderDate = new Date(order.createdAt).getTime();

//       if (orderDate >= todayStart) {
//         todaySales += orderSellerRevenue;
//         todayOrders++;
//       }
//       if (orderDate >= weekStart) {
//         weekSales += orderSellerRevenue;
//         weekOrders++;
//       }
//       if (orderDate >= monthStart) {
//         monthSales += orderSellerRevenue;
//         monthOrders++;
//       }
//     }
//   }

//   return {
//     totalSales: Math.round(totalSales * 100) / 100,
//     todaySales: Math.round(todaySales * 100) / 100,
//     weekSales: Math.round(weekSales * 100) / 100,
//     monthSales: Math.round(monthSales * 100) / 100,
//     totalOrders,
//     todayOrders,
//     weekOrders,
//     monthOrders,
//     avgOrderValue: totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0
//   };
// }

// async function getTopProducts(sellerId) {
//   const topProducts = await Order.aggregate([
//     { $match: { "cart.shopId": sellerId } },
//     { $unwind: "$cart" },
//     { $match: { "cart.shopId": sellerId } },
//     {
//       $group: {
//         _id: "$cart._id",
//         name: { $first: "$cart.name" },
//         quantitySold: { $sum: "$cart.qty" },
//         price: { $first: "$cart.discountPrice" }
//       }
//     },
//     { $sort: { quantitySold: -1 } },
//     { $limit: 5 }
//   ]);

//   return topProducts.map(p => ({
//     id: p._id,
//     name: p.name,
//     soldCount: p.quantitySold,
//     price: p.price
//   }));
// }

// async function getLowStock(sellerId, threshold = 10) {
//   if (!sellerId) {
//     return {
//       totalLowStockItems: 0,
//       products: [],
//       message: "No seller ID provided"
//     };
//   }

//   const products = await Product.find({
//     shopId: sellerId,
//     stock: { $lt: threshold }
//   })
//   .select("name category stock discountPrice")
//   .sort({ stock: 1 })
//   .lean();

//   const totalLowStockItems = products.length;

//   const formattedProducts = products.map(p => ({
//     name: p.name,
//     currentStock: p.stock,
//     price: p.discountPrice,
//     category: p.category,
//     urgency: p.stock <= 2 ? "HIGH" : "MEDIUM"
//   }));

//   if (totalLowStockItems === 0) {
//     return {
//       totalLowStockItems: 0,
//       products: [],
//       message: "No low stock items found"
//     };
//   }

//   return {
//     totalLowStockItems,
//     products: formattedProducts
//   };
// }

// async function handleIntent(intentData, sellerId) {
//   const { intent, entities } = intentData;
//   const timeRange = entities?.timeRange || "today";
//   console.log("Intent:", intent);
//   console.log("Time Range:", timeRange);
//   switch (intent) {
//     case "get_sales_summary":
//       return await getSalesSummary(sellerId);
//     case "get_top_products":
//       return await getTopProducts(sellerId);
//     case "get_low_stock":
//       return await getLowStock(sellerId);
//     default:
//       throw new Error(`Unsupported intent: ${intent}`);
//   }
// }

// module.exports = {
//   handleIntent,
//   getSalesSummary,
//   getTopProducts,
//   getLowStock
// };
