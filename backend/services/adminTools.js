const { tool } = require("@langchain/core/tools");
const z = require("zod");
const Order = require("../model/order");
const Product = require("../model/product");
const get_top_seller_tool = tool(
    async ({ limit = 5 }) => {
        try {
            const topSellers = await Order.aggregate([
                // 1️⃣ break cart array
                { $unwind: "$cart" },

                // 2️⃣ group by shopId (STRING)
                {
                    $group: {
                        _id: "$cart.shopId",

                        shopName: { $first: "$cart.shop.name" },

                        totalRevenue: {
                            $sum: {
                                $multiply: [
                                    "$cart.originalPrice",
                                    "$cart.qty"
                                ]
                            }
                        },

                        totalItemsSold: { $sum: "$cart.qty" }
                    }
                },

                // 3️⃣ sort highest revenue
                { $sort: { totalRevenue: -1 } },

                { $limit: limit },

                // 4️⃣ final format
                {
                    $project: {
                        _id: 0,
                        shopId: "$_id",
                        shopName: 1,
                        totalRevenue: 1,
                        totalItemsSold: 1
                    }
                }
            ]);

            console.log("🔥 TOP SELLERS:", topSellers);

            return JSON.stringify({
                success: true,
                intent: "GetTopSellers",
                message:
                    topSellers.length > 0
                        ? "Top sellers fetched successfully"
                        : "No sellers found",
                currencySymbol: "₹",
                data: {
                    sellers: topSellers,
                },
            });

        } catch (error) {
            console.error("❌ ERROR:", error);

            return JSON.stringify({
                success: false,
                intent: "GetTopSellers",
                message: "Error fetching top sellers",
                data: { sellers: [] },
            });
        }
    },
    {
        name: "get_top_seller_tool",
        description: "Get top sellers based on cart revenue",
        schema: z.object({
            limit: z.number().optional(),
        }),
    }
);
const get_revenue_stats_tool = tool(
    async ({ range = "all" }) => {
        try {
            let matchStage = {};

            const now = new Date();

            // 🔥 FILTER BY DATE RANGE
            if (range === "today") {
                const start = new Date();
                start.setHours(0, 0, 0, 0);

                matchStage.createdAt = { $gte: start };
            }

            if (range === "week") {
                const start = new Date();
                start.setDate(now.getDate() - 7);

                matchStage.createdAt = { $gte: start };
            }

            if (range === "month") {
                const start = new Date();
                start.setMonth(now.getMonth() - 1);

                matchStage.createdAt = { $gte: start };
            }

            // 🧠 AGGREGATION
            const stats = await Order.aggregate([
                { $match: matchStage },

                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$totalPrice" },
                        totalOrders: { $sum: 1 },
                    },
                },
            ]);

            const result = stats[0] || {
                totalRevenue: 0,
                totalOrders: 0,
            };

            const avgOrderValue =
                result.totalOrders > 0
                    ? Math.round(result.totalRevenue / result.totalOrders)
                    : 0;

            return JSON.stringify({
                success: true,
                intent: "GetRevenueStats",
                message:
                    result.totalOrders > 0
                        ? `Total revenue is ₹${result.totalRevenue} from ${result.totalOrders} orders`
                        : "No data found",
                currencySymbol: "₹",
                data: {
                    totalRevenue: result.totalRevenue,
                    totalOrders: result.totalOrders,
                    avgOrderValue,
                    range,
                },
            });
        } catch (error) {
            console.error("❌ REVENUE TOOL ERROR:", error);

            return JSON.stringify({
                success: false,
                intent: "GetRevenueStats",
                message: "Error fetching revenue stats",
                data: {
                    totalRevenue: 0,
                    totalOrders: 0,
                    avgOrderValue: 0,
                },
            });
        }
    },
    {
        name: "get_revenue_stats_tool",
        description:
            "Get total revenue, total orders, and average order value (today, week, month, all)",
        schema: z.object({
            range: z.enum(["today", "week", "month", "all"]).optional(),
        }),
    }
);

const get_orders_summary_tool = tool(
  async ({ range = "all" }) => {
    try {
      let matchStage = {};
      const now = new Date();

      // 📅 DATE FILTER
      if (range === "today") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        matchStage.createdAt = { $gte: start };
      }

      if (range === "week") {
        const start = new Date();
        start.setDate(now.getDate() - 7);
        matchStage.createdAt = { $gte: start };
      }

      if (range === "month") {
        const start = new Date();
        start.setMonth(now.getMonth() - 1);
        matchStage.createdAt = { $gte: start };
      }

      // 🔥 AGGREGATE BY STATUS
      const stats = await Order.aggregate([
        { $match: matchStage },

        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      // 🧠 DEFAULT COUNTS
      let summary = {
        totalOrders: 0,
        delivered: 0,
        inProgress: 0,
        cancelled: 0,
        statusBreakdown: {},
      };

      // 🔄 PROCESS RESULTS
      stats.forEach((item) => {
        const status = item._id;
        const count = item.count;

        summary.totalOrders += count;
        summary.statusBreakdown[status] = count;

        // ✅ Delivered
        if (status === "Delivered") {
          summary.delivered += count;
        }

        // ❌ Cancelled (if exists in future)
        else if (status === "Cancelled") {
          summary.cancelled += count;
        }

        // ⏳ Everything else = In Progress
        else {
          summary.inProgress += count;
        }
      });

      return JSON.stringify({
        success: true,
        intent: "GetOrdersSummary",
        message:
          summary.totalOrders > 0
            ? `You have ${summary.totalOrders} orders: ${summary.delivered} delivered, ${summary.inProgress} in progress`
            : "No orders found",
        data: {
          ...summary,
          range,
        },
      });
    } catch (error) {
      console.error("❌ ORDERS SUMMARY ERROR:", error);

      return JSON.stringify({
        success: false,
        intent: "GetOrdersSummary",
        message: "Error fetching order summary",
        data: {
          totalOrders: 0,
          delivered: 0,
          inProgress: 0,
          cancelled: 0,
          statusBreakdown: {},
        },
      });
    }
  },
  {
    name: "get_orders_summary_tool",
    description:
      "Get summary of orders including total, delivered, in-progress, and cancelled",
    schema: z.object({
      range: z.enum(["today", "week", "month", "all"]).optional(),
    }),
  }
);
const get_top_products_tool = tool(
  async ({ limit = 5, range = "all" }) => {
    try {
      let matchStage = {};
      const now = new Date();

      // 📅 DATE FILTER
      if (range === "today") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        matchStage.createdAt = { $gte: start };
      }

      if (range === "week") {
        const start = new Date();
        start.setDate(now.getDate() - 7);
        matchStage.createdAt = { $gte: start };
      }

      if (range === "month") {
        const start = new Date();
        start.setMonth(now.getMonth() - 1);
        matchStage.createdAt = { $gte: start };
      }

      const topProducts = await Order.aggregate([
        { $match: matchStage },

        // 🔥 Break cart array
        { $unwind: "$cart" },

        // 📊 Group by product
        {
          $group: {
            _id: "$cart._id", // productId
            name: { $first: "$cart.name" },
            image: { $first: { $arrayElemAt: ["$cart.images", 0] } },

            totalSold: { $sum: "$cart.qty" },

            totalRevenue: {
              $sum: {
                $multiply: ["$cart.discountPrice", "$cart.qty"],
              },
            },
          },
        },

        // 🔽 Sort by sales
        { $sort: { totalSold: -1 } },

        // 🎯 Limit
        { $limit: limit },
      ]);

      return JSON.stringify({
        success: true,
        intent: "GetTopProducts",
        message:
          topProducts.length > 0
            ? `Top ${topProducts.length} selling products fetched`
            : "No products found",
        currencySymbol: "₹",
        data: {
          products: topProducts.map((p) => ({
            productId: p._id,
            name: p.name,
            image: p.images?.[0] || null,
            totalSold: p.totalSold,
            totalRevenue: p.totalRevenue,
          })),
          range,
        },
      });
    } catch (error) {
      console.error("❌ TOP PRODUCTS ERROR:", error);

      return JSON.stringify({
        success: false,
        intent: "GetTopProducts",
        message: "Error fetching top products",
        data: {
          products: [],
        },
      });
    }
  },
  {
    name: "get_top_products_tool",
    description:
      "Get top selling products based on quantity and revenue",
    schema: z.object({
      limit: z.number().optional(),
      range: z.enum(["today", "week", "month", "all"]).optional(),
    }),
  }
);
const get_low_stock_tool = tool(
  async ({ threshold = 10, limit = 10 }) => {
    try {
      // 🔍 Find products with low stock
      const products = await Product.find({
        stock: { $lte: threshold },
      })
        .limit(limit)
        .lean();

      // 🧠 Format response
      const formatted = products.map((p) => {
        let level = "safe";

        if (p.stock === 0) level = "out_of_stock";
        else if (p.stock <= 5) level = "critical";
        else if (p.stock <= threshold) level = "warning";

        return {
          productId: p._id,
          name: p.name,
          stock: p.stock,
          image: p.images?.[0] || null,
          shopId: p.shopId,
          alertLevel: level,
        };
      });

      return JSON.stringify({
        success: true,
        intent: "GetLowStock",
        message:
          formatted.length > 0
            ? `${formatted.length} low stock product(s) found`
            : "No low stock products",
        data: {
          products: formatted,
          threshold,
        },
      });
    } catch (error) {
      console.error("❌ LOW STOCK ERROR:", error);

      return JSON.stringify({
        success: false,
        intent: "GetLowStock",
        message: "Error fetching low stock products",
        data: {
          products: [],
        },
      });
    }
  },
  {
    name: "get_low_stock_tool",
    description:
      "Get products with low or out-of-stock inventory with alert levels",
    schema: z.object({
      threshold: z.number().optional(), // default 10
      limit: z.number().optional(),
    }),
  }
);
const get_top_customers_tool = tool(
  async ({ limit = 5, period = "all" }) => {
    try {
      // 🗓️ Date filter (optional)
      let matchStage = {};

      if (period === "week") {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        matchStage.createdAt = { $gte: lastWeek };
      }

      if (period === "month") {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        matchStage.createdAt = { $gte: lastMonth };
      }

      // 📊 Aggregation
      const topCustomers = await Order.aggregate([
        {
          $match: matchStage, // optional filter
        },
        {
          $group: {
            _id: "$user._id",
            name: { $first: "$user.name" },
            email: { $first: "$user.email" },

            totalOrders: { $sum: 1 },
            totalSpent: { $sum: "$totalPrice" },
          },
        },
        {
          $sort: { totalSpent: -1 }, // 🔥 Top spenders
        },
        {
          $limit: limit,
        },
      ]);

      if (!topCustomers.length) {
        return JSON.stringify({
          success: true,
          intent: "GetTopCustomers",
          message: "No customers found",
          data: { customers: [] },
        });
      }

      // 🧠 Format response
      const formatted = topCustomers.map((c) => ({
        userId: c._id,
        name: c.name,
        email: c.email,
        totalOrders: c.totalOrders,
        totalSpent: c.totalSpent,
      }));

      return JSON.stringify({
        success: true,
        intent: "GetTopCustomers",
        message: "Top customers fetched successfully",
        data: {
          customers: formatted,
          period,
        },
        currencySymbol: "₹",
      });
    } catch (error) {
      console.error("❌ TOP CUSTOMERS ERROR:", error);

      return JSON.stringify({
        success: false,
        intent: "GetTopCustomers",
        message: "Error fetching top customers",
        data: { customers: [] },
      });
    }
  },
  {
    name: "get_top_customers_tool",
    description:
      "Get top customers based on total spending and order count (week/month/all)",
    schema: z.object({
      limit: z.number().optional(),
      period: z.enum(["week", "month", "all"]).optional(),
    }),
  }
);


module.exports = {
    get_top_seller_tool,
    get_revenue_stats_tool,
    get_orders_summary_tool,
    get_top_products_tool,
    get_low_stock_tool,
    get_top_customers_tool
};