const mongoose = require("mongoose");
const Order = require("../model/order");
const sellerService = require("./sellerService");
const z = require("zod");
const { tool } = require("@langchain/core/tools");

// -----------------------------
// Helper: Date Range
// -----------------------------
const getDateRange = (time_range) => {
  const now = new Date();
  let startDate;

  switch (time_range) {
    case "today":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;

    case "this_week":
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;

    case "this_month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    default:
      throw new Error("Invalid time_range");
  }

  return { $gte: startDate };
};

// -----------------------------
// 1. Revenue Tool
// -----------------------------
const get_revenue_tool = tool(
  async ({ time_range }, config) => {
    const sellerId = config?.configurable?.sellerId;
    if (!sellerId) throw new Error("sellerId missing");

    const result = await Order.aggregate([
      { $match: { createdAt: getDateRange(time_range) } },
      { $unwind: "$cart" },
      { $match: { "cart.shopId": sellerId } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $multiply: ["$cart.discountPrice", "$cart.qty"],
            },
          },
        },
      },
    ]);

    const totalRevenue = result[0]?.totalRevenue || 0;

    return JSON.stringify({
      totalRevenue,
      currency: "INR",
      currencySymbol: "₹",
      formattedRevenue: `₹${totalRevenue}`,
      timeRange: time_range,
      message: `Total revenue for ${time_range.replace("_", " ")}`,
    });
  },
  {
    name: "get_revenue_tool",
    description: "Get seller revenue",
    schema: z.object({
      time_range: z.enum(["today", "this_week", "this_month"]),
    }),
  }
);

// -----------------------------
// 2. Orders Tool
// -----------------------------
const get_orders_tool = tool(
  async ({ time_range }, config) => {
    const sellerId = config?.configurable?.sellerId;
    if (!sellerId) throw new Error("sellerId missing");

    const result = await Order.aggregate([
      { $match: { createdAt: getDateRange(time_range) } },
      { $unwind: "$cart" },
      { $match: { "cart.shopId": sellerId } },
      { $group: { _id: "$_id" } },
      { $count: "totalOrders" },
    ]);

    return JSON.stringify({
      totalOrders: result[0]?.totalOrders || 0,
      timeRange: time_range,
      message: `Total orders for ${time_range.replace("_", " ")}`,
    });
  },
  {
    name: "get_orders_tool",
    description: "Get total orders",
    schema: z.object({
      time_range: z.enum(["today", "this_week", "this_month"]),
    }),
  }
);

// -----------------------------
// 3. Top Product Tool
// -----------------------------
const get_top_product_tool = tool(
  async ({ time_range }, config) => {
    const sellerId = config?.configurable?.sellerId;
    if (!sellerId) throw new Error("sellerId missing");

    // const result = await Order.aggregate([
    //   { $match: { createdAt: getDateRange(time_range) } },
    //   { $unwind: "$cart" },
    //   { $match: { "cart.shopId": sellerId } },
    //   {
    //     $group: {
    //       _id: "$cart.productId",
    //       name: { $first: "$cart.name" },
    //       totalQuantity: { $sum: "$cart.qty" },
    //       totalRevenue: {
    //         $sum: {
    //           $multiply: ["$cart.discountPrice", "$cart.qty"],
    //         },
    //       },
    //     },
    //   },
    //   { $sort: { totalQuantity: -1 } },
    //   { $limit: 1 },
    // ]);
    const result = await Order.aggregate([
      { $match: { createdAt: getDateRange(time_range) } },

      { $unwind: "$cart" },

      {
        $match: {
          "cart.shopId": sellerId
        }
      },

      {
        $group: {
          _id: {
            productId: {
              $ifNull: ["$cart.productId", "$cart.name"]
            }
          },

          name: { $first: "$cart.name" },

          totalQuantity: { $sum: "$cart.qty" },

          totalRevenue: {
            $sum: {
              $multiply: ["$cart.discountPrice", "$cart.qty"]
            }
          }
        }
      },

      { $sort: { totalQuantity: -1 } },
      { $limit: 1 }
    ]);
    
    if (!result.length) {
      return JSON.stringify({
        productName: "No sales",
        totalQuantity: 0,
        totalRevenue: 0,
        message: "No sales found",
      });
    }

    const p = result[0];

    return JSON.stringify({
      productName: p.name,
      totalQuantity: p.totalQuantity,
      totalRevenue: p.totalRevenue,
      currencySymbol: "₹", // ADD
      formattedRevenue: `₹${p.totalRevenue}`, // FIX
      message: `Top product: ${p.name}`,
    });
  },
  {
    name: "get_top_product_tool",
    description: "Get top product",
    schema: z.object({
      time_range: z.enum(["today", "this_week", "this_month"]),
    }),
  }
);

// -----------------------------
// 4. Low Stock Tool
// -----------------------------
const get_low_stock_tool = tool(
  async ({ threshold = 10 }, config) => {
    const sellerId = config?.configurable?.sellerId;
    if (!sellerId) throw new Error("sellerId missing");

    const data = await sellerService.getLowStock(sellerId, threshold);

    return JSON.stringify({
      totalLowStockItems: data.totalLowStockItems,
      products: data.products,
      currency: "INR",
      currencySymbol: "₹",
      message:
        data.products.length === 0
          ? "All products are sufficiently stocked"
          : `Found ${data.totalLowStockItems} low stock items`,
    });
  },
  {
    name: "get_low_stock_tool",
    description: "Get low stock products",
    schema: z.object({
      threshold: z.number().default(10),
    }),
  }
);

const get_low_selling_products_tool = tool(
  async ({ time_range, limit = 5 }, config) => {
    const sellerId = config?.configurable?.sellerId;
    if (!sellerId) throw new Error("sellerId missing");

    const result = await Order.aggregate([
      // 1. Filter by time
      { $match: { createdAt: getDateRange(time_range) } },

      // 2. Expand cart items
      { $unwind: "$cart" },

      // 3. Filter seller products
      {
        $match: {
          "cart.shopId": sellerId
        }
      },

      // 4. Group by product
      {
        $group: {
          _id: {
            productId: {
              $ifNull: ["$cart.productId", "$cart.name"]
            }
          },
          name: { $first: "$cart.name" },
          totalQuantity: { $sum: "$cart.qty" },
          totalRevenue: {
            $sum: {
              $multiply: ["$cart.discountPrice", "$cart.qty"]
            }
          }
        }
      },

      // 5. Sort ASC (low selling first)
      { $sort: { totalQuantity: 1 } },

      // 6. Limit results
      { $limit: limit }
    ]);

    if (!result.length) {
      return JSON.stringify({
        message: "No sales data found",
        products: []
      });
    }

    return JSON.stringify({
      timeRange: time_range,
      count: result.length,
      products: result.map((p) => ({
        productName: p.name,
        quantitySold: p.totalQuantity,
        revenue: p.totalRevenue,
        formattedRevenue: `₹${p.totalRevenue}`
      })),
      message: `Found ${result.length} low selling products`
    });
  },
  {
    name: "get_low_selling_products_tool",
    description: "Get products with lowest sales performance",
    schema: z.object({
      time_range: z.enum(["today", "this_week", "this_month"]),
      limit: z.number().optional().default(5)
    }),
  }
);
// -----------------------------
// Business Growth Tool
// -----------------------------
const getMonthRange = (year, month) => {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return { start, end };
};
const get_business_growth_tool = tool(
  async (_, config) => {
    const sellerId = config?.configurable?.sellerId;
    if (!sellerId) throw new Error("sellerId missing");

    const now = new Date();

    const thisMonth = getMonthRange(now.getFullYear(), now.getMonth());
    const lastMonth = getMonthRange(now.getFullYear(), now.getMonth() - 1);

    const getRevenue = async (range) => {
      const result = await Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: range.start,
              $lte: range.end,
            },
          },
        },
        { $unwind: "$cart" },
        {
          $match: {
            "cart.shopId": sellerId,
          },
        },
        {
          $group: {
            _id: null,
            revenue: {
              $sum: {
                $multiply: ["$cart.discountPrice", "$cart.qty"],
              },
            },
          },
        },
      ]);

      return result[0]?.revenue || 0;
    };

    const thisMonthRevenue = await getRevenue(thisMonth);
    const lastMonthRevenue = await getRevenue(lastMonth);

    // IMPORTANT FIX: handle empty data properly
    if (thisMonthRevenue === 0 && lastMonthRevenue === 0) {
      return JSON.stringify({
        thisMonthRevenue: 0,
        lastMonthRevenue: 0,
        growthPercent: 0,
        status: "No sales data 📉",
        message: "Not enough data to calculate growth yet",
      });
    }

    let growthPercent = 0;

    if (lastMonthRevenue > 0) {
      growthPercent =
        ((thisMonthRevenue - lastMonthRevenue) /
          lastMonthRevenue) *
        100;
    }

    let status = "Stable ➖";

    if (growthPercent > 0) status = "Growing 📈";
    else if (growthPercent < 0) status = "Declining 📉";

    return JSON.stringify({
      thisMonthRevenue,
      lastMonthRevenue,
      growthPercent: growthPercent.toFixed(2),
      status,
      currency: "₹",
      message: `Business is ${status}`,
    });
  },
  {
    name: "get_business_growth_tool",
    description:
      "Compares this month vs last month revenue and calculates business growth",
    schema: z.object({}),
  }
);

const get_category_sales_tool = tool(
  async ({ time_range }, config) => {
    const sellerId = config?.configurable?.sellerId;
    if (!sellerId) throw new Error("sellerId missing");

    const result = await Order.aggregate([
      // 1. Time filter
      {
        $match: {
          createdAt: getDateRange(time_range),
        },
      },

      // 2. Flatten cart
      { $unwind: "$cart" },

      // 3. Filter seller
      {
        $match: {
          "cart.shopId": sellerId,
        },
      },

      // 4. Convert string productId (_id) → ObjectId for lookup
      {
        $lookup: {
          from: "products",
          let: {
            pid: { $toObjectId: "$cart._id" }, // IMPORTANT FIX
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$pid"],
                },
              },
            },
          ],
          as: "product",
        },
      },

      // 5. Remove unmatched products
      { $unwind: "$product" },

      // 6. Group by category from product collection
      {
        $group: {
          _id: "$product.category",

          totalQuantity: {
            $sum: "$cart.qty",
          },

          totalRevenue: {
            $sum: {
              $multiply: [
                "$cart.discountPrice",
                "$cart.qty",
              ],
            },
          },

          products: {
            $addToSet: "$product.name",
          },
        },
      },

      // 7. Sort by revenue
      {
        $sort: {
          totalRevenue: -1,
        },
      },
    ]);

    if (!result.length) {
      return JSON.stringify({
        categories: [],
        message: "No category data found",
      });
    }

    return JSON.stringify({
      categories: result.map((c) => ({
        category: c._id || "Unknown",
        totalQuantity: c.totalQuantity,
        totalRevenue: c.totalRevenue,
        formattedRevenue: `₹${c.totalRevenue}`,
        productCount: c.products.length,
      })),

      topCategory: result[0]?._id || "Unknown",

      message: `Category performance for ${time_range}`,
    });
  },
  {
    name: "get_category_sales_tool",
    description:
      "Get seller category-wise sales using cart._id → products lookup",
    schema: z.object({
      time_range: z.enum([
        "today",
        "this_week",
        "this_month",
      ]),
    }),
  }
);
// -----------------------------
// PRODUCT TYPE SALES TOOL
// -----------------------------
const get_product_type_sales_tool = tool(
  async ({ time_range }, config) => {
    const sellerId = config?.configurable?.sellerId;
    if (!sellerId) throw new Error("sellerId missing");

    const result = await Order.aggregate([
      // 1. Filter by time
      {
        $match: {
          createdAt: getDateRange(time_range),
        },
      },

      // 2. Flatten cart
      { $unwind: "$cart" },

      // 3. Filter seller
      {
        $match: {
          "cart.shopId": sellerId,
        },
      },

      // 4. Lookup product details
      {
        $lookup: {
          from: "products",
          let: {
            pid: {
              $convert: {
                input: "$cart._id",
                to: "objectId",
                onError: null,
                onNull: null,
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$pid"],
                },
              },
            },
          ],
          as: "product",
        },
      },

      // 5. Unwind product safely
      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 6. Group by productType
      {
        $group: {
          _id: {
            $ifNull: ["$product.productType", "Unknown"],
          },

          totalQuantity: {
            $sum: "$cart.qty",
          },

          totalRevenue: {
            $sum: {
              $multiply: ["$cart.discountPrice", "$cart.qty"],
            },
          },

          products: {
            $addToSet: "$product.name",
          },
        },
      },

      // 7. Sort best performing first
      {
        $sort: {
          totalRevenue: -1,
        },
      },
    ]);

    if (!result.length) {
      return JSON.stringify({
        productTypes: [],
        message: "No product type data found",
      });
    }

    return JSON.stringify({
      productTypes: result.map((t) => ({
        productType: t._id,
        totalQuantity: t.totalQuantity,
        totalRevenue: t.totalRevenue,
        formattedRevenue: `₹${t.totalRevenue}`,
        productCount: t.products.length,
      })),

      topProductType: result[0]?._id,

      message: `Product type performance for ${time_range}`,
    });
  },
  {
    name: "get_product_type_sales_tool",
    description:
      "Get seller sales grouped by productType using products collection",
    schema: z.object({
      time_range: z.enum(["today", "this_week", "this_month"]),
    }),
  }
);
// -----------------------------
// BRAND SALES TOOL (TOP + LOW)
// -----------------------------
const get_brand_sales_tool = tool(
  async ({ time_range, mode = "top" }, config) => {
    const sellerId = config?.configurable?.sellerId;
    if (!sellerId) throw new Error("sellerId missing");

    const sortOrder = mode === "low" ? 1 : -1;

    const result = await Order.aggregate([
      // 1. Filter by time
      {
        $match: {
          createdAt: getDateRange(time_range),
        },
      },

      // 2. Flatten cart
      { $unwind: "$cart" },

      // 3. Filter seller
      {
        $match: {
          "cart.shopId": sellerId,
        },
      },

      // 4. Convert cart._id (string) → ObjectId and join products
      {
        $lookup: {
          from: "products",
          let: {
            productId: {
              $convert: {
                input: "$cart._id",
                to: "objectId",
                onError: null,
                onNull: null,
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$productId"],
                },
              },
            },
          ],
          as: "product",
        },
      },

      // 5. Unwind product safely
      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 6. Group by brand (from product collection)
      {
        $group: {
          _id: {
            $ifNull: ["$product.brand", "Unknown"],
          },

          totalQuantity: {
            $sum: "$cart.qty",
          },

          totalRevenue: {
            $sum: {
              $multiply: [
                "$cart.discountPrice",
                "$cart.qty",
              ],
            },
          },
        },
      },

      // 7. Sort (top or low)
      {
        $sort: {
          totalRevenue: sortOrder,
        },
      },

      // 8. Limit results
      {
        $limit: 5,
      },
    ]);

    if (!result.length) {
      return JSON.stringify({
        mode,
        brands: [],
        message: "No brand data found",
      });
    }

    return JSON.stringify({
      mode,
      brands: result.map((b) => ({
        brand: b._id,
        totalQuantity: b.totalQuantity,
        totalRevenue: b.totalRevenue,
        formattedRevenue: `₹${b.totalRevenue}`,
      })),

      topBrand: result[0]?._id,

      message:
        mode === "low"
          ? "Lowest performing brands"
          : "Top performing brands",
    });
  },
  {
    name: "get_brand_sales_tool",
    description:
      "Get brand-wise sales (top or low performing)",
    schema: z.object({
      time_range: z.enum([
        "today",
        "this_week",
        "this_month",
      ]),
      mode: z.enum(["top", "low"]).default("top"),
    }),
  }
);

module.exports = {
  get_revenue_tool,
  get_orders_tool,
  get_top_product_tool,
  get_low_stock_tool,
  get_low_selling_products_tool,
  get_business_growth_tool,
  get_category_sales_tool,
  get_product_type_sales_tool,
  get_brand_sales_tool
};