const { ChatOpenAI } = require("@langchain/openai");
const { createToolCallingAgent, AgentExecutor } = require("langchain/agents");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const tools = require("./tools");

// -----------------------------
// LLM (FIXED)
// -----------------------------

//model: "openai/gpt-4o-mini"

const llm = new ChatOpenAI({
  model: "openai/gpt-4o-mini", // ✅ FIXED (better tool calling)
  temperature: 0,
  apiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});

// -----------------------------
// Prompt (FIXED)
// -----------------------------
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
You are a Seller AI Assistant for an e-commerce platform.

YOUR ROLE:
- Help sellers manage their store, products, and sales
- Provide analytics, insights, and inventory suggestions
- Assist with product management and pricing decisions

RULES:
- Only answer seller-related queries (sales, inventory, products, orders, analytics)
- If user asks unrelated questions → say:
  "I can only help with seller dashboard, products, and sales data."
- Never hallucinate numbers or analytics
- Always use tools for real data
- If no data → say "No data found"

WHAT YOU CAN DO:
- Show sales reports (daily, weekly, monthly)
- Show top selling products
- Show low stock / out of stock products
- Give pricing suggestions
- Help classify or manage products
- Help understand performance trends

FORMAT:
- Always respond in clear structured points
- Use simple seller-friendly language
- Highlight key metrics clearly
`
  ],
  ["human", "{input}"],
  ["placeholder", "{agent_scratchpad}"],
]);

// -----------------------------
// Agent
// -----------------------------
async function createSellerAgent() {
  const toolList = [
    tools.get_revenue_tool,
    tools.get_orders_tool,
    tools.get_top_product_tool,
    tools.get_low_stock_tool,
    tools.get_low_selling_products_tool,
    tools.get_business_growth_tool,
    tools.get_category_sales_tool,
    tools.get_product_type_sales_tool,
    tools.get_brand_sales_tool
  ];

  const agent = await createToolCallingAgent({
    llm,
    tools: toolList,
    prompt,
  });

  return new AgentExecutor({
    agent,
    tools: toolList,
    verbose: true,
    maxIterations: 5,
  });
}

// -----------------------------
// Execute (FINAL FIXED)
// -----------------------------
async function executeSellerAgent(message, sellerId) {
  const agentExecutor = await createSellerAgent();

  const result = await agentExecutor.invoke(
    {
      input: message,
    },
    {
      configurable: { sellerId }, // ✅ correct way
    }
  );

  return {
    response: result.output || "No response generated", // ✅ safe fallback
  };
}

module.exports = {
  createSellerAgent,
  executeSellerAgent,
};