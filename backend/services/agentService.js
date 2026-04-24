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
You are a Customer Shopping Assistant AI.

RULES:
- Only answer shopping-related queries
- If not related → say "I can only help with shopping and orders"
- Always use tools for data/actions
- Never guess or hallucinate
- If no results → "No products found"
- Show products as a numbered list with name and price
- Confirm cart actions clearly
- Always return a clear, user-friendly answer
- Always return final structured answer
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