const { ChatOpenAI } = require("@langchain/openai");
// 🚀 V1.X UPGRADE: Mirroring customerAgentService imports
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const tools = require("./tools");

// Initialize LLM using your existing AI Credits wrapper credentials
const llm = new ChatOpenAI({
    model: "openai/gpt-4o-mini",
    temperature: 0,
    apiKey: process.env.AICREDITS_API_KEY,
    configuration: {
        baseURL: "https://api.aicredits.in/v1",
    },
});

// System rules matching your specific seller instructions
const systemInstructionString = `You are a Seller AI Assistant for an e-commerce platform.

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
- Highlight key metrics clearly.`;

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

    // ✅ Pass the pure string directly just like customer agent setup
    return createReactAgent({
        llm,
        tools: toolList,
        messageModifier: systemInstructionString, 
    });
}

async function executeSellerAgent(message, sellerId) {
    const agentExecutor = await createSellerAgent();

    const result = await agentExecutor.invoke(
        { 
            messages: [
                { role: "user", content: message }
            ] 
        },
        {
            configurable: {
                sellerId,
            },
        }
    );

    const steps = result.messages;
    
    // Scan backwards to find if any tool execution captured data blocks
    const aiMessagesWithTools = steps.filter(m => m.tool_calls && m.tool_calls.length > 0);
    
    if (aiMessagesWithTools.length > 0) {
        const lastAiMessage = aiMessagesWithTools[aiMessagesWithTools.length - 1];
        const lastToolCall = lastAiMessage.tool_calls[0];
        
        // Find the matching ToolMessage response document inside LangGraph's execution path
        const toolOutputMessage = steps.find(m => m.tool_call_id === lastToolCall.id);

        if (toolOutputMessage && toolOutputMessage.content) {
            try {
                const toolResponse = JSON.parse(toolOutputMessage.content);
                const finalResponse = steps[steps.length - 1].content;

                // 🚀 Mirroring the exact return structure from your customer agent
                return {
                    response: {
                        success: toolResponse.success ?? true,
                        intent: toolResponse.intent || "SellerQuery", 
                        message: finalResponse,
                        data: {
                            ...toolResponse.data,
                        },
                    },
                };
            } catch (err) {
                console.error("Tool parsing error on LangGraph stream:", err);
            }
        }
    }

    // Fallback if no specialized analytical database tool was invoked by the assistant graph
    const finalOutput = steps[steps.length - 1].content;
    return {
        response: {
            success: true,
            intent: "SellerQuery",
            message: finalOutput,
            data: null,
        },
    };
}

module.exports = {
    createSellerAgent,
    executeSellerAgent,
};