const axios = require("axios");

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// System prompt for AI - Strictly e-commerce domain only
const SYSTEM_PROMPT = `You are an AI assistant for an e-commerce platform called SigmaStore. Your ONLY purpose is to help with shopping-related queries.

STRICT RULES:
1. You MUST ONLY respond to e-commerce related queries about: products, prices, availability, cart operations, orders, recommendations, and shipping.
2. If a user asks about anything unrelated (politics, general knowledge, coding, personal advice, etc.), you MUST respond with a JSON indicating "Unknown" intent.
3. You MUST return ONLY valid JSON. No explanations, no markdown, no extra text.
4. Do NOT make up product information - extract only what the user explicitly mentions.

INTENT TYPES (use exactly these values):
- "AddToCart" - User wants to add product(s) to cart
- "CheckAvailability" - User wants to check if product is in stock
- "GetPrice" - User wants to know the price of product(s)
- "RemoveFromCart" - User wants to remove product from cart
- "ShowCart" - User wants to see their cart contents
- "RecommendProducts" - User wants product recommendations
- "SortByPrice" - User wants products sorted by price (cheapest/costly)
- "PopularProducts" - User wants to see popular/bestselling products
- "AutoSearch" - User wants to search for products (e.g., "search for laptops", "find latest phones")
- "Payment" - User asks about payment methods, how to pay, add bank account, checkout process
- "RecipeIngredients" - User asks about ingredients needed for a recipe (e.g., "ingredients for kesari", "what do I need to make biryani")
- "Unknown" - Query is not related to e-commerce

RESPONSE FORMAT (strict JSON):
{
  "intent": "<intent_type>",
  "products": [
    {
      "name": "<product_name from user message>",
      "quantity": <number>,
      "unit": "<unit if mentioned, e.g., kg, pcs, otherwise empty>"
    }
  ],
  "category": "<category if mentioned, e.g., Electronics, Fashion, etc.>",
  "sortOrder": "<asc for cheapest, desc for costly>",
  "recipeName": "<recipe/dish name if asking about ingredients>",
  "ingredients": ["<ingredient1>", "<ingredient2>", ...],
  "reply": "<friendly one-line acknowledgment of what you understood>"
}

EXAMPLES:

User: "Add 2 kg of rice to my cart"
Response:
{
  "intent": "AddToCart",
  "products": [{"name": "rice", "quantity": 2, "unit": "kg"}],
  "category": "",
  "sortOrder": "",
  "reply": "I'll add 2 kg of rice to your cart."
}

User: "Show me cheap laptops"
Response:
{
  "intent": "SortByPrice",
  "products": [{"name": "laptops", "quantity": 1, "unit": ""}],
  "category": "Electronics",
  "sortOrder": "asc",
  "reply": "Showing you the most affordable laptops."
}

User: "What's the price of iPhone?"
Response:
{
  "intent": "GetPrice",
  "products": [{"name": "iPhone", "quantity": 1, "unit": ""}],
  "category": "",
  "sortOrder": "",
  "reply": "Let me check the price of iPhone for you."
}

User: "Who is the president of USA?"
Response:
{
  "intent": "Unknown",
  "products": [],
  "category": "",
  "sortOrder": "",
  "reply": "I can only help with shopping-related queries like products, orders, and cart operations."
}

User: "What products do you have in Fashion category?"
Response:
{
  "intent": "RecommendProducts",
  "products": [],
  "category": "Fashion",
  "sortOrder": "",
  "reply": "Let me show you products in the Fashion category."
}

User: "Show my cart"
Response:
{
  "intent": "ShowCart",
  "products": [],
  "category": "",
  "sortOrder": "",
  "reply": "Here are the items in your cart."
}

User: "Remove shoes from my cart"
Response:
{
  "intent": "RemoveFromCart",
  "products": [{"name": "shoes", "quantity": 1, "unit": ""}],
  "category": "",
  "sortOrder": "",
  "reply": "I'll remove shoes from your cart."
}

User: "What are your best selling products?"
Response:
{
  "intent": "PopularProducts",
  "products": [],
  "category": "",
  "sortOrder": "",
  "reply": "Here are our bestselling products."
}

User: "ingredients for kesari"
Response:
{
  "intent": "RecipeIngredients",
  "products": [],
  "category": "",
  "sortOrder": "",
  "recipeName": "kesari",
  "ingredients": ["rava", "sugar", "ghee", "cashew nuts", "raisins", "cardamom", "saffron", "milk", "water"],
  "reply": "Here are the ingredients needed for kesari."
}

User: "what do I need to make biryani"
Response:
{
  "intent": "RecipeIngredients",
  "products": [],
  "category": "",
  "sortOrder": "",
  "recipeName": "biryani",
  "ingredients": ["rice", "chicken", "onion", "tomato", "yogurt", "ginger garlic paste", "biryani masala", "saffron", "ghee", "mint leaves", "coriander leaves"],
  "reply": "Here are the ingredients needed for biryani."
}

IMPORTANT: 
- Always return valid JSON only.
- Never add product details that the user didn't mention.
- For Unknown intent, always give the same reply about shopping-related queries.
- For RecipeIngredients intent, always include recipeName and ingredients array with common ingredient names.`;

/**
 * Call OpenRouter API to get AI response
 * @param {string} userMessage - The user's message
 * @returns {Promise<Object>} - Parsed JSON response with intent and extracted data
 */
async function getAIIntent(userMessage) {
  try {
    if (!OPENROUTER_API_KEY) {
      console.error("OpenRouter API key not configured");
      return getFallbackResponse(userMessage);
    }

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: "meta-llama/llama-3.3-70b-instruct:free", // You can change to other models like "anthropic/claude-3-haiku"
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.1, // Low temperature for consistent JSON output
        max_tokens: 500, // Increased for ingredient lists
        response_format: { type: "json_object" }, // Force JSON response
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
          "X-Title": "SigmaStore AI Assistant",
        },
        timeout: 10000, // 10 second timeout
      }
    );

    const aiContent = response.data.choices[0]?.message?.content;
    console.log(aiContent);
    if (!aiContent) {
      console.error("Empty response from AI");
      return getFallbackResponse(userMessage);
    }

    // Parse the JSON response
    const parsedResponse = safeParseJSON(aiContent);

    if (!parsedResponse || !parsedResponse.intent) {
      console.error("Invalid AI response format:", aiContent);
      return getFallbackResponse(userMessage);
    }

    // Validate and sanitize the response
    return validateAndSanitizeResponse(parsedResponse);
  } catch (error) {
    console.error("OpenRouter API error:", error.message);
    if (error.response) {
      console.error("API Error details:", error.response.data);
    }
    return getFallbackResponse(userMessage);
  }
}

/**
 * Safely parse JSON string
 * @param {string} jsonString - JSON string to parse
 * @returns {Object|null} - Parsed object or null
 */
function safeParseJSON(jsonString) {
  try {
    // Remove any potential markdown code blocks
    let cleaned = jsonString.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    }
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("JSON parse error:", error.message);
    return null;
  }
}

/**
 * Validate and sanitize AI response
 * @param {Object} response - Parsed AI response
 * @returns {Object} - Sanitized response
 */
function validateAndSanitizeResponse(response) {
  const validIntents = [
    "AddToCart",
    "CheckAvailability",
    "GetPrice",
    "RemoveFromCart",
    "ShowCart",
    "RecommendProducts",
    "SortByPrice",
    "PopularProducts",
    "AutoSearch",
    "Payment",
    "RecipeIngredients",
    "Unknown",
  ];

  // Ensure intent is valid
  if (!validIntents.includes(response.intent)) {
    response.intent = "Unknown";
  }

  // Ensure products is an array
  if (!Array.isArray(response.products)) {
    response.products = [];
  }

  // Sanitize products array
  response.products = response.products.map((product) => ({
    name: String(product.name || "").trim(),
    quantity: Math.max(1, parseInt(product.quantity) || 1),
    unit: String(product.unit || "").trim(),
  }));

  // Ensure category is a string
  response.category = String(response.category || "").trim();

  // Ensure sortOrder is valid
  if (!["asc", "desc", ""].includes(response.sortOrder)) {
    response.sortOrder = "";
  }

  // Ensure reply is a string
  response.reply = String(response.reply || "").trim();

  // Ensure recipeName is a string (for RecipeIngredients intent)
  response.recipeName = String(response.recipeName || "").trim();

  // Ensure ingredients is an array (for RecipeIngredients intent)
  if (!Array.isArray(response.ingredients)) {
    response.ingredients = [];
  }

  // Sanitize ingredients array
  response.ingredients = response.ingredients
    .map((ingredient) => String(ingredient || "").trim())
    .filter((ingredient) => ingredient.length > 0);

  return response;
}

/**
 * Fallback response when AI fails
 * @param {string} userMessage - Original user message
 * @returns {Object} - Fallback response object
 */
function getFallbackResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();

  // IMPORTANT: Order matters! Check specific patterns before generic ones
  
  // Check for Payment intent FIRST - when user asks about payment methods or checkout process
  if (/payment|pay\s|checkout|bank|card|debit|credit|paypal|cod|cash on delivery|how to (pay|buy|order|purchase)|shipping address|online payment|payment option/i.test(lowerMessage)) {
    return {
      intent: "Payment",
      products: [],
      category: "",
      sortOrder: "",
      reply: "I'll guide you through the payment process.",
    };
  }

  // Check for RemoveFromCart (before generic cart check)
  if (/remove|delete/i.test(lowerMessage)) {
    // Extract product name from messages like "remove apple from cart" or "delete apple from cart"
    // Handle various patterns: "remove apple", "remove apple from cart", "delete apple from my cart", "remove the apple from cart"
    let productName = "";
    
    // Clean up message - remove common filler words from the beginning
    let cleanedMessage = lowerMessage.replace(/^(please|kindly|can you|could you|i want to|i'd like to|just)\s+/i, "");
    
    // Try pattern: remove/delete [product] from (my/the) cart
    const fromCartMatch = cleanedMessage.match(/(?:remove|delete)\s+(?:the\s+)?(.+?)\s+from\s+(?:the\s+)?(?:my\s+)?cart/i);
    if (fromCartMatch) {
      productName = fromCartMatch[1].trim();
    } else {
      // Try pattern: remove/delete [product] (without "from cart") - match until end or common stop words
      const simpleMatch = cleanedMessage.match(/(?:remove|delete)\s+(?:the\s+)?(.+?)(?:\s*$)/i);
      if (simpleMatch) {
        productName = simpleMatch[1].trim();
      }
    }
    
    // Clean up product name - remove common filler words at the end
    productName = productName.replace(/\s+(please|now|thanks?|thank you)$/i, "").trim();
    
    return {
      intent: "RemoveFromCart",
      products: productName ? [{ name: productName, quantity: 1, unit: "" }] : [],
      category: "",
      sortOrder: "",
      reply: productName ? `I'll remove ${productName} from your cart.` : "I'll help you remove items from your cart.",
    };
  }

  // Check for ShowCart (before generic cart check)
  if (/show.*cart|my cart|view cart|what's in.*cart|cart contents/i.test(lowerMessage)) {
    return {
      intent: "ShowCart",
      products: [],
      category: "",
      sortOrder: "",
      reply: "Here are the items in your cart.",
    };
  }

  // Check for AddToCart
  if (/add|buy|purchase/i.test(lowerMessage)) {
    const productMatch = lowerMessage.match(/(?:add|buy|put)\s+(\d+)?\s*(\w+(?:\s+\w+)*)/i);
    return {
      intent: "AddToCart",
      products: productMatch
        ? [{ name: productMatch[2] || "product", quantity: parseInt(productMatch[1]) || 1, unit: "" }]
        : [],
      category: "",
      sortOrder: "",
      reply: "I'll help you add items to your cart.",
    };
  }

  if (/price|cost|how much/i.test(lowerMessage)) {
    return {
      intent: "GetPrice",
      products: [],
      category: "",
      sortOrder: "",
      reply: "Let me check the price for you.",
    };
  }

  if (/available|stock|in stock/i.test(lowerMessage)) {
    return {
      intent: "CheckAvailability",
      products: [],
      category: "",
      sortOrder: "",
      reply: "Let me check availability for you.",
    };
  }

  if (/recommend|suggest|show.*products/i.test(lowerMessage)) {
    return {
      intent: "RecommendProducts",
      products: [],
      category: "",
      sortOrder: "",
      reply: "Let me show you some product recommendations.",
    };
  }

  if (/cheap|lowest|afford/i.test(lowerMessage)) {
    return {
      intent: "SortByPrice",
      products: [],
      category: "",
      sortOrder: "asc",
      reply: "Showing you the most affordable products.",
    };
  }

  if (/expensive|highest|premium/i.test(lowerMessage)) {
    return {
      intent: "SortByPrice",
      products: [],
      category: "",
      sortOrder: "desc",
      reply: "Showing you the premium products.",
    };
  }

  if (/popular|best.*selling|top.*products/i.test(lowerMessage)) {
    return {
      intent: "PopularProducts",
      products: [],
      category: "",
      sortOrder: "",
      reply: "Here are our bestselling products.",
    };
  }

  // Check for RecipeIngredients - when user asks about ingredients for a recipe
  if (/ingredients?\s+(for|needed\s+for|required\s+for)|what\s+do\s+i\s+need\s+(to\s+make|for)|how\s+to\s+make|items?\s+needed\s+for|recipe\s+for/i.test(lowerMessage)) {
    // Extract recipe name from various patterns
    let recipeName = "";
    
    // Try pattern: ingredients for [recipe]
    const ingredientsForMatch = lowerMessage.match(/ingredients?\s+(?:for|needed\s+for|required\s+for)\s+(.+)/i);
    if (ingredientsForMatch) {
      recipeName = ingredientsForMatch[1].trim();
    }
    
    // Try pattern: what do I need to make [recipe]
    const whatNeedMatch = lowerMessage.match(/what\s+do\s+i\s+need\s+(?:to\s+make|for)\s+(.+)/i);
    if (!recipeName && whatNeedMatch) {
      recipeName = whatNeedMatch[1].trim();
    }
    
    // Try pattern: how to make [recipe]
    const howToMakeMatch = lowerMessage.match(/how\s+to\s+make\s+(.+)/i);
    if (!recipeName && howToMakeMatch) {
      recipeName = howToMakeMatch[1].trim();
    }
    
    // Try pattern: items needed for [recipe]
    const itemsNeededMatch = lowerMessage.match(/items?\s+needed\s+for\s+(.+)/i);
    if (!recipeName && itemsNeededMatch) {
      recipeName = itemsNeededMatch[1].trim();
    }
    
    // Try pattern: recipe for [recipe]
    const recipeForMatch = lowerMessage.match(/recipe\s+for\s+(.+)/i);
    if (!recipeName && recipeForMatch) {
      recipeName = recipeForMatch[1].trim();
    }
    
    // Clean up recipe name
    recipeName = recipeName
      .replace(/\s+(please|now|thanks?|thank you)$/i, "")
      .replace(/^(a|an|the|some)\s+/i, "")
      .trim();
    
    if (recipeName) {
      return {
        intent: "RecipeIngredients",
        products: [],
        category: "",
        sortOrder: "",
        recipeName: recipeName,
        ingredients: [], // Will be populated by backend
        reply: `Let me check the ingredients available for ${recipeName}.`,
      };
    }
  }

  // Check for AutoSearch - when user wants to search for products
  if (/search|find|look for|looking for|show me|i want/i.test(lowerMessage)) {
    // Extract search query from various patterns
    let searchQuery = "";
    
    // Try pattern: search/find for [query]
    const searchForMatch = lowerMessage.match(/(?:search|find|look(?:ing)?\s+for)\s+(.+)/i);
    if (searchForMatch) {
      searchQuery = searchForMatch[1].trim();
    }
    
    // Try pattern: show me [query]
    const showMeMatch = lowerMessage.match(/show\s+me\s+(.+)/i);
    if (!searchQuery && showMeMatch) {
      searchQuery = showMeMatch[1].trim();
    }
    
    // Try pattern: i want [query]
    const iWantMatch = lowerMessage.match(/i\s+want\s+(.+)/i);
    if (!searchQuery && iWantMatch) {
      searchQuery = iWantMatch[1].trim();
    }
    
    // Clean up search query
    searchQuery = searchQuery
      .replace(/\s+(please|now|thanks?|thank you)$/i, "")
      .replace(/^(a|an|the|some)\s+/i, "")
      .trim();
    
    if (searchQuery) {
      return {
        intent: "AutoSearch",
        products: [{ name: searchQuery, quantity: 1, unit: "" }],
        category: "",
        sortOrder: "",
        searchQuery: searchQuery,
        reply: `Searching for "${searchQuery}" for you!`,
      };
    }
  }

  return {
    intent: "Unknown",
    products: [],
    category: "",
    sortOrder: "",
    reply: "I can only help with shopping-related queries like products, orders, and cart operations.",
  };
}

module.exports = {
  getAIIntent,
  safeParseJSON,
  validateAndSanitizeResponse,
};