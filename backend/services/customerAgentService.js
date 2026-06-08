const { ChatOpenAI } = require("@langchain/openai");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const tools = require("./customerTools");

// Initialize LLM using your existing AI Credits wrapper credentials
const llm = new ChatOpenAI({
    model: "openai/gpt-4o-mini",
    temperature: 0,
    apiKey: process.env.AICREDITS_API_KEY,
    configuration: {
        baseURL: "https://api.aicredits.in/v1",
    },
});

// System rules for the agent
const systemInstructionString = `You are a Customer Shopping Assistant AI.

RULES:
- Only help with shopping related queries
- You can help with:
  • product search
  • product details
  • cart operations (add/remove/view)
  • order tracking
  • recommendations

- NEVER provide seller analytics:
  (revenue, brand performance, category sales, business insights)
- If asked analytics → say:
  "I can only help with shopping and orders"

- Always use tools when possible
- Never hallucinate product data
- If no result → say "No products found"
- Be helpful and concise.`;

async function createCustomerAgent() {
    const toolList = [
        tools.get_payment_help_tool,
        tools.search_products_tool,
        tools.get_product_details_tool,
        tools.add_to_cart_tool,
        tools.remove_from_cart_tool,
        tools.get_cart_tool,
        tools.get_order_status_tool,
        tools.get_recommendation_tool,
        tools.filter_products_tool
    ];

    // ✅ FIXED: Passing the pure string directly lets LangGraph handle state formatting natively
    return createReactAgent({
        llm,
        tools: toolList,
        messageModifier: systemInstructionString, 
    });
}

async function executeCustomerAgent(message, userId, sessionId) {
    const agentExecutor = await createCustomerAgent();

    const result = await agentExecutor.invoke(
        { 
            messages: [
                { role: "user", content: message }
            ] 
        },
        {
            configurable: {
                userId,
                sessionId,
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

                return {
                    response: {
                        success: toolResponse.success ?? true,
                        intent: toolResponse.intent || "CustomerQuery", 
                        message: finalResponse,
                        data: {
                            products: toolResponse.products || [],
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
            intent: "CustomerQuery",
            message: finalOutput,
            data: null,
        },
    };
}

module.exports = {
    createCustomerAgent,
    executeCustomerAgent,
};