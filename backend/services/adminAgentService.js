const { ChatOpenAI } = require("@langchain/openai");
const { createToolCallingAgent, AgentExecutor } = require("langchain/agents");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const adminTools = require("./adminTools"); // 👈 separate admin tools

// TO USE OPENROUTER CHANGE
// apiKey: process.env.OPENROUTER_API_KEY,
// baseURL: "https://openrouter.ai/api/v1"
// -----------------------------
// LLM (same config)
// -----------------------------
const llm = new ChatOpenAI({
    model: "openai/gpt-4o-mini",
    temperature: 0,
    apiKey: process.env.AICREDITS_API_KEY,
    configuration: {
        baseURL: "https://api.aicredits.in/v1",
    },
});

// -----------------------------
// ADMIN PROMPT (IMPORTANT)
// -----------------------------
const prompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `
You are an Admin Dashboard AI.

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
- Only respond as an admin system assistant
`,
    ],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
]);

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

    const agent = await createToolCallingAgent({
        llm,
        tools: toolList,
        prompt,
    });

    return new AgentExecutor({
        agent,
        tools: toolList,
        verbose: true,
        returnIntermediateSteps: true,
        maxIterations: 5,
    });
}

// -----------------------------
// EXECUTE ADMIN AGENT
// -----------------------------
async function executeAdminAgent(message, adminId ) {
    const agentExecutor = await createAdminAgent();

    const result = await agentExecutor.invoke(
        { input: message },
        {
            configurable: {
                adminId
            },
        }
    );

    const steps = result.intermediateSteps;

    if (steps && steps.length > 0) {
        const lastStep = steps[steps.length - 1];

        if (lastStep.observation) {
            try {
                const toolResponse = JSON.parse(lastStep.observation);

                console.log("ADMIN TOOL RESPONSE:", toolResponse);

                return {
                    response: {
                        success: toolResponse.success ?? true,
                        intent: toolResponse.intent || "AdminQuery",
                        message: result.output,
                        data: {
                            ...toolResponse.data,
                        },
                    },
                };
            } catch (err) {
                console.error("Parse error:", err);
            }
        }
    }

    // fallback
    return {
        response: {
            success: true,
            intent: "AdminQuery",
            message: result.output,
            data: null,
        },
    };
}

module.exports = {
    createAdminAgent,
    executeAdminAgent,
};