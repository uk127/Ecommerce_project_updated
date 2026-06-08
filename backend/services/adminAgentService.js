const { ChatOpenAI } = require("@langchain/openai");
// 🚀 V1.X UPGRADE: Import the prebuilt agent factory directly from LangGraph
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const adminTools = require("./adminTools"); 

// Initialize LLM using your existing AI Credits wrapper credentials
const llm = new ChatOpenAI({
    model: "openai/gpt-4o-mini",
    temperature: 0,
    apiKey: process.env.AICREDITS_API_KEY,
    configuration: {
        baseURL: "https://api.aicredits.in/v1",
    },
});

// 🚀 V1.X FIXED: Converted to a raw string to completely bypass prompt input validation errors
const systemInstructionString = `You are an Admin Dashboard AI.

ROLE:
You help admin users manage and monitor the platform.

YOU CAN:
• View platform analytics (sales, revenue, users)
• Manage products (add/update/delete)
• View and manage orders
• View users and sellers
• Handle reports and issues

YOU MUST:
- Always use tools for real data
- Never guess or hallucinate
- Keep answers short and structured
- If no data → say "No data found"

RESTRICTIONS:
- Do NOT answer customer shopping queries
- Do NOT behave like a seller assistant
- Only respond as an admin system assistant`;

// -----------------------------
// CREATE ADMIN AGENT
// -----------------------------
async function createAdminAgent() {
    const toolList = [
        adminTools.get_top_seller_tool,
        adminTools.get_revenue_stats_tool,
        adminTools.get_orders_summary_tool,
        adminTools.get_top_products_tool,
        adminTools.get_low_stock_tool,
        adminTools.get_top_customers_tool
    ];

    // ✅ FIXED: Passing the pure string directly lets LangGraph handle state formatting natively
    return createReactAgent({
        llm,
        tools: toolList,
        messageModifier: systemInstructionString, 
    });
}

// -----------------------------
// EXECUTE ADMIN AGENT
// -----------------------------
async function executeAdminAgent(message, adminId) {
    const agentExecutor = await createAdminAgent();

    // 🚀 V1.X UPGRADE: Format input into state messages expected by LangGraph graphs
    const result = await agentExecutor.invoke(
        { 
            messages: [
                { role: "user", content: message }
            ] 
        },
        {
            configurable: {
                adminId
            },
        }
    );

    // 🚀 V1.X UPGRADE: Extract execution states backwards from the state history array
    const steps = result.messages;
    const aiMessagesWithTools = steps.filter(m => m.tool_calls && m.tool_calls.length > 0);
    
    if (aiMessagesWithTools.length > 0) {
        const lastAiMessage = aiMessagesWithTools[aiMessagesWithTools.length - 1];
        const lastToolCall = lastAiMessage.tool_calls[0];
        
        // Match the correct tool message ID with the execution response trace
        const toolOutputMessage = steps.find(m => m.tool_call_id === lastToolCall.id);

        if (toolOutputMessage && toolOutputMessage.content) {
            try {
                const toolResponse = JSON.parse(toolOutputMessage.content);
                const finalResponse = steps[steps.length - 1].content;

                console.log("ADMIN TOOL RESPONSE:", toolResponse);

                return {
                    response: {
                        success: toolResponse.success ?? true,
                        intent: toolResponse.intent || "AdminQuery",
                        message: finalResponse,
                        data: {
                            ...toolResponse.data,
                        },
                    },
                };
            } catch (err) {
                console.error("Parse error on LangGraph admin message stream:", err);
            }
        }
    }

    // Fallback if no specific analytics tool was invoked by the model
    const finalOutput = steps[steps.length - 1].content;
    return {
        response: {
            success: true,
            intent: "AdminQuery",
            message: finalOutput,
            data: null,
        },
    };
}

module.exports = {
    createAdminAgent,
    executeAdminAgent,
};