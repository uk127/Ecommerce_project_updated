const { tool } = require("@langchain/core/tools");
const z = require("zod");

const Product = require("../model/product");
const Order = require("../model/order");
const Cart = require("../model/cart"); // if you have it (or inside user model)
const AICart = require("../model/aiCart");
// -----------------------------
// 1. PRODUCT SEARCH (DB FILTER)
// -----------------------------
const search_products_tool = tool(
    async ({ query, category, maxPrice }, config) => {
        try {
            console.log("🔍 SEARCH TOOL CALLED:", { query, category, maxPrice });

            const filter = {};

            // ✅ Category filter
            if (category && category.trim() !== "") {
                filter.category = { $regex: category, $options: "i" };
            }

            // ✅ Price filter
            if (maxPrice !== null && maxPrice !== undefined) {
                filter.discountPrice = { $lte: maxPrice };
            }

            // ✅ Query search (name / brand / tags)
            if (query && query.trim() !== "") {
                filter.$or = [
                    { name: { $regex: query, $options: "i" } },
                    { brand: { $regex: query, $options: "i" } },
                    { tags: { $regex: query, $options: "i" } },
                ];
            }

            const products = await Product.find(filter)
                .limit(10)
                .lean();

            return JSON.stringify({
                success: true,
                intent: "SearchProducts",

                searchSummary: {
                    query: query || null,
                    category: category || null,
                    maxPrice: maxPrice || null,
                    totalResults: products.length,
                },

                products: products.map((p) => ({
                    productId: p._id,
                    name: p.name,
                    price: p.discountPrice,
                    formattedPrice: `₹${p.discountPrice}`,
                    originalPrice: p.originalPrice,
                    image: p.images?.[0] || null,
                    stock: p.stock,
                    shopId: p.shopId,
                })),

                topResult: products[0]?._id || null,

                message:
                    products.length > 0
                        ? `Found ${products.length} product(s) matching your search`
                        : "No products found",
            });

        } catch (error) {
            console.error("❌ SEARCH TOOL ERROR:", error);

            return JSON.stringify({
                success: false,
                intent: "SearchProducts",
                message: "Error while searching products",
                data: {
                    products: [],
                    count: 0,
                },
            });
        }
    },
    {
        name: "search_products_tool",
        description:
            "Search products by name, brand, category, tags, and price filter",

        // 🔥 FIXED SCHEMA (IMPORTANT)
        schema: z.object({
            query: z.string().nullable(),
            category: z.string().nullable(),
            maxPrice: z.number().nullable(),
        }),
    }
);

// -----------------------------
// 2. PRODUCT DETAILS
// -----------------------------
const get_product_details_tool = tool(
    async ({ productId }) => {
        const product = await Product.findById(productId).lean();

        if (!product) {
            return JSON.stringify({
                message: "Product not found",
            });
        }

        return JSON.stringify({
            product,
            message: "Product details fetched",
        });
    },
    {
        name: "get_product_details_tool",
        description: "Get full product details",
        schema: z.object({
            productId: z.string(),
        }),
    }
);

// -----------------------------
// 3. FILTER PRODUCTS
// -----------------------------
const filter_products_tool = tool(
    async ({
        keyword,
        minPrice,
        maxPrice,
        brand,
        category,
        productType,
        tags,
        sortBy,
        limit = 20,
    }) => {
        let query = {};

        // 🔍 Keyword search (name + description)
        if (keyword) {
            query.$or = [
                { name: { $regex: keyword, $options: "i" } },
                { description: { $regex: keyword, $options: "i" } },
            ];
        }

        // 💰 Price filter (use discountPrice)
        if (minPrice || maxPrice) {
            query.discountPrice = {};
            if (minPrice) query.discountPrice.$gte = minPrice;
            if (maxPrice) query.discountPrice.$lte = maxPrice;
        }

        // 🏷 Brand
        if (brand) {
            query.brand = brand;
        }

        // 📦 Category
        if (category) {
            query.category = category;
        }

        // 📦 Product Type
        if (productType) {
            query.productType = productType;
        }

        // 🏷 Tags
        if (tags && tags.length > 0) {
            query.tags = { $in: tags };
        }

        // 📦 Only in-stock items
        query.stock = { $gt: 0 };
        query.sold_out = 0;

        // 🔄 Sorting
        let sortOption = {};
        switch (sortBy) {
            case "price_asc":
                sortOption.discountPrice = 1;
                break;
            case "price_desc":
                sortOption.discountPrice = -1;
                break;
            case "newest":
                sortOption.createdAt = -1;
                break;
            default:
                sortOption.createdAt = -1;
        }

        const products = await Product.find(query)
            .sort(sortOption)
            .limit(limit)
            .lean();

        if (!products.length) {
            return JSON.stringify({
                products: [],
                message: "No products found",
            });
        }

        // 🎯 Clean response (important for AI)
        const formattedProducts = products.map((p) => ({
            productId: p._id,
            name: p.name,
            price: p.discountPrice,
            originalPrice: p.originalPrice,
            brand: p.brand,
            category: p.category,
            image: p.images?.[0],
            stock: p.stock,
        }));

        return JSON.stringify({
            products: formattedProducts,
            count: formattedProducts.length,
            message: "Filtered products fetched",
        });
    },
    {
        name: "filter_products_tool",
        description: "Filter products by price, category, brand, tags, etc.",
        schema: z.object({
            keyword: z.string().optional(),
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
            brand: z.string().optional(),
            category: z.string().optional(),
            productType: z.string().optional(),
            tags: z.array(z.string()).optional(),
            sortBy: z.enum(["price_asc", "price_desc", "newest"]).optional(),
            limit: z.number().optional(),
        }),
    }
);

// -----------------------------
// 3. ADD TO CART
// -----------------------------
// const add_to_cart_tool = tool(
//     async ({ userId, productId, qty }) => {
//         const product = await Product.findById(productId);

//         if (!product) {
//             return JSON.stringify({
//                 success: false,
//                 message: "Product not found",
//             });
//         }

//         // simple cart logic (adjust to your schema)
//         await Cart.updateOne(
//             { userId },
//             {
//                 $push: {
//                     items: {
//                         productId,
//                         qty,
//                         name: product.name,
//                         price: product.discountPrice,
//                     },
//                 },
//             },
//             { upsert: true }
//         );

//         return JSON.stringify({
//             success: true,
//             message: `${product.name} added to cart`,
//         });
//     },
//     {
//         name: "add_to_cart_tool",
//         description: "Add product to cart",
//         schema: z.object({
//             userId: z.string(),
//             productId: z.string(),
//             qty: z.number().default(1),
//         }),
//     }
// );

// -----------------------------
// 4. REMOVE FROM CART
// -----------------------------
const remove_from_cart_tool = tool(
    async ({ userId, productId }) => {
        await Cart.updateOne(
            { userId },
            {
                $pull: {
                    items: { productId },
                },
            }
        );

        return JSON.stringify({
            success: true,
            message: "Item removed from cart",
        });
    },
    {
        name: "remove_from_cart_tool",
        description: "Remove item from cart",
        schema: z.object({
            userId: z.string(),
            productId: z.string(),
        }),
    }
);

// -----------------------------
// 5. VIEW CART
// -----------------------------
const get_cart_tool = tool(
    async ({ userId }) => {
        const cart = await Cart.findOne({ userId }).lean();

        return JSON.stringify({
            cart: cart?.items || [],
            totalItems: cart?.items?.length || 0,
            message: "Cart fetched",
        });
    },
    {
        name: "get_cart_tool",
        description: "Get user cart",
        schema: z.object({
            userId: z.string(),
        }),
    }
);

// -----------------------------
// 6. ORDER STATUS
// -----------------------------
const get_order_status_tool = tool(
    async ({ userId }) => {
        const orders = await Order.find({ "user.userId": userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        return JSON.stringify({
            orders,
            message: "Recent orders fetched",
        });
    },
    {
        name: "get_order_status_tool",
        description: "Get user order status",
        schema: z.object({
            userId: z.string(),
        }),
    }
);

// -----------------------------
// 7. RECOMMENDATION (RAG READY HOOK)
// -----------------------------
const get_recommendation_tool = tool(
    async ({ query }) => {
        // You can replace this with VECTOR SEARCH (RAG)
        const products = await Product.find({
            $text: { $search: query },
        })
            .limit(5)
            .lean();

        return JSON.stringify({
            currencySymbol: "₹",
            recommendations: products,
            message: "Recommended products",
        });
    },
    {
        name: "get_recommendation_tool",
        description: "Recommend products based on query (RAG ready)",
        schema: z.object({
            query: z.string(),
        }),
    }
);
// -----------------------------
// Payment Help Tool
// -----------------------------
const get_payment_help_tool = tool(
    async ({ }, config) => {
        const paymentGuide = {
            steps: [
                {
                    step: 1,
                    title: "Go to Cart",
                    description:
                        "Click on the cart icon in the header to view your cart items",
                },
                {
                    step: 2,
                    title: "Proceed to Checkout",
                    description:
                        "Click the 'Checkout' button to start the payment process",
                },
                {
                    step: 3,
                    title: "Shipping Information",
                    description: "Fill in your shipping details:",
                    fields: [
                        "Full Name",
                        "Email Address",
                        "Phone Number",
                        "Zip Code",
                        "Country",
                        "City",
                    ],
                },
                {
                    step: 4,
                    title: "Payment Method",
                    description: "Choose your preferred payment method:",
                    options: ["Debit/Credit Card", "PayPal", "Cash on Delivery (COD)"],
                },
                {
                    step: 5,
                    title: "Confirm Order",
                    description:
                        "Click the 'Confirm' button to complete your order",
                },
            ],
        };

        return JSON.stringify({
            success: true,
            intent: "Payment",
            message:
                "Here is a step-by-step guide to complete your payment process.",
            data: paymentGuide,
        });
    },
    {
        name: "get_payment_help_tool",
        description:
            "Provides step-by-step guidance for payment, checkout, and order completion process",
        schema: z.object({}),
    }
);


// Helper: find product (fuzzy search)
// async function findProductByName(name) {
//     return await Product.findOne({
//         $or: [
//             { name: new RegExp(name, "i") },
//             { tags: new RegExp(name, "i") },
//             { category: new RegExp(name, "i") },
//         ],
//     });
// }

async function findProductByName(name) {
    if (!name) return null;

    const cleanName = name.trim();

    // 1. Exact match
    let product = await Product.findOne({
        name: { $regex: `^${cleanName}$`, $options: "i" },
    });

    if (product) return product;

    // 2. Partial match (BEST FIX HERE)
    product = await Product.findOne({
        name: { $regex: cleanName, $options: "i" },
    });

    if (product) return product;

    // 3. tags match
    product = await Product.findOne({
        tags: { $in: [new RegExp(cleanName, "i")] },
    });

    if (product) return product;

    // 4. brand/category fallback
    product = await Product.findOne({
        $or: [
            { brand: { $regex: cleanName, $options: "i" } },
            { category: { $regex: cleanName, $options: "i" } },
            { productType: { $regex: cleanName, $options: "i" } },
        ],
    });

    return product;
}

// -----------------------------
// ADD TO CART TOOL
// -----------------------------
const add_to_cart_tool = tool(
    async ({ products }, config) => {
        const userId = config?.configurable?.userId;
        console.log("config?.configurable?.userId", config?.configurable?.userId);
        if (!userId) {
            throw new Error("userId is required");
        }

        const results = [];
        const notFound = [];

        for (const p of products) {
            const product = await findProductByName(p.name);

            if (!product) {
                notFound.push(p.name);
                continue;
            }

            const quantity = p.quantity || 1;

            let cart = await Cart.findOne({ userId });

            if (!cart) {
                cart = await Cart.create({
                    userId,
                    items: [],
                });
            }

            const existingItem = cart.items.find(
                (item) => item.productId.toString() === product._id.toString()
            );

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({
                    productId: product._id,
                    quantity,
                });
            }

            await cart.save();

            results.push({
                success: true,
                productName: product.name,
                quantity,
                message: `Added ${product.name} to cart`,
            });
        }

        // return JSON.stringify({
        //   success: true,
        //   intent: "AddToCart",
        //   message: results.map(r => r.message).join(" "),
        //   data: {
        //     addedItems: results,
        //     notFound,
        //   },
        // });
        return JSON.stringify({
            success: true,
            intent: "AddToCart",
            message: "Added coriander to cart",
            data: {
                products: cartProducts   // 🔥 required for frontend
            }
        });
    },
    {
        name: "add_to_cart_tool",
        description: "Add products to cart using userId",
        schema: z.object({
            products: z.array(
                z.object({
                    name: z.string(),
                    quantity: z.number().optional(),
                })
            ),
        }),
    }
);



// -----------------------------
// EXPORT
// -----------------------------
module.exports = {
    search_products_tool,
    get_product_details_tool,
    add_to_cart_tool,
    remove_from_cart_tool,
    get_cart_tool,
    get_order_status_tool,
    get_recommendation_tool,
    get_payment_help_tool,
    filter_products_tool
};