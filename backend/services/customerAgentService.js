const { ChatOpenAI } = require("@langchain/openai");
const { createToolCallingAgent, AgentExecutor } = require("langchain/agents");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const tools = require("./customerTools"); // 👈 separate tool file

// -----------------------------
// LLM (same as seller)
// -----------------------------
// const llm = new ChatOpenAI({
//     model: "openai/gpt-4o-mini",
//     temperature: 0,
//     apiKey: process.env.OPENROUTER_API_KEY,
//     configuration: {
//         baseURL: "https://openrouter.ai/api/v1",
//     },
// });
const llm = new ChatOpenAI({
    model: "openai/gpt-4o-mini",
    temperature: 0,
    apiKey: process.env.AICREDITS_API_KEY,
    configuration: {
        baseURL: "https://api.aicredits.in/v1",
    },
});

// -----------------------------
// CUSTOMER PROMPT (IMPORTANT CHANGE)
// -----------------------------
const prompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `
You are a Customer Shopping Assistant AI.

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
- Be helpful and concise
`,
    ],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
]);

// -----------------------------
// CREATE AGENT
// -----------------------------
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
// EXECUTE (same pattern as seller)
// -----------------------------
async function executeCustomerAgent(message, userId, sessionId) {
    const agentExecutor = await createCustomerAgent();

    const result = await agentExecutor.invoke(
        { input: message },
        {
            configurable: {
                userId,
                sessionId,
            },
        }
    );

    // console.log("FULL RESULT:", JSON.stringify(result, null, 2));

    // ✅ TOOL OUTPUT EXISTS HERE
    const steps = result.intermediateSteps;

    if (steps && steps.length > 0) {
        const lastStep = steps[steps.length - 1];

        if (lastStep.observation) {
            try {
                const toolResponse = JSON.parse(lastStep.observation);

                console.log("TOOL RESPONSE:", toolResponse);

                return {
                    response: {
                        success: toolResponse.success ?? true,
                        intent: toolResponse.intent || "CustomerQuery", // ✅ GET INTENT HERE
                        message: result.output,
                        data: {
                            products: toolResponse.products || [],
                            ...toolResponse.data,
                        },
                    },
                };
            } catch (err) {
                console.error("Parse error:", err);
            }
        }
    }

    // fallback (no tool used)
    return {
        response: {
            success: true,
            intent: "CustomerQuery",
            message: result.output,
            data: null,
        },
    };
}
module.exports = {
    createCustomerAgent,
    executeCustomerAgent,
};