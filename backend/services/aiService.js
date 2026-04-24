const axios = require("axios");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Generic function to call OpenRouter API
 */
async function callOpenRouter(systemPrompt, userPrompt) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER API key is not configured");
  }
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openrouter/free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0,
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:8001"
        }
      }
    );
    console.log("OpenRouter API response:", response.data.choices[0].message.content.trim());
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("OpenRouter API error:", error.response ? error.response.data : error.message);
    throw new Error("Failed to call AI API");
  }
}

/**
 * Safely parse JSON from AI response
 */
function parseJSON(content) {
  let cleaned = content;
  if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json/, "");
  if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```/, "");
  if (cleaned.endsWith("```")) cleaned = cleaned.replace(/```$/, "");
  try {
    return JSON.parse(cleaned.trim());
  } catch(e) {
    console.error("Failed to parse JSON:", cleaned);
    return null;
  }
}

/**
 * Classify intent of the seller's message
 */
async function classifyIntent(message) {
  const systemPrompt = `You are an advanced intent classification AI for a seller analytics chatbot.

Your job:
1. Classify the user query into ONE intent
2. Extract structured entities
3. Be strict and accurate

Supported Intents:
- get_sales_summary
- get_top_products
- get_low_stock
- fallback

Entities to extract:
- timeRange: "today", "week", "month"
- limit: number (default: 5)
- sortBy: "quantity" or "revenue"
- product: specific product name if mentioned
- responseType: "short" (simple questions) or "detailed" (analysis/advice)

Rules:
- Default limit is 5. Extract specific numbers (e.g., "top 10" -> limit 10).
- "most sold", "highest sold" -> sortBy: "quantity"
- "top", "highest revenue", "profit" -> sortBy: "revenue"
- No time mentioned -> timeRange: "today"
- Choose the closest intent. If completely unrelated -> "fallback".

Confidence:
- Return a confidence score between 0 and 1. High confidence only if clear.

Return ONLY JSON:
{
  "intent": "<intent>",
  "confidence": <0 to 1>,
  "entities": {
    "timeRange": "<today | week | month>",
    "limit": <number>,
    "sortBy": "<quantity | revenue>",
    "product": "<string | null>",
    "responseType": "<short | detailed>"
  }
}`;

  const content = await callOpenRouter(systemPrompt, message);
  const parsed = parseJSON(content);
  return parsed || { intent: "fallback", confidence: 0, entities: { responseType: "short" } };
}

/**
 * Generate Final Response
 */
async function generateFinalResponse(query, data, entities) {
  const { responseType } = entities || {};

  const systemPrompt = `You are an AI assistant for an e-commerce seller dashboard.
Your role: explain data, generate insights, and suggest actions based ONLY on the provided data.

Data Safety Rules:
- AI must use ONLY provided data. No hallucinations, no fake trends.
- If no comparison can be made, say "No clear trend observed".
- If values are the same, say "No variation observed".

Response Behavior:
IF responseType = "short":
- 1-2 lines only.
- Direct answer based on data.
- Max 1 insight.
- NO recommendations unless necessary.

IF responseType = "detailed":
- Format EXACTLY like this:

Summary:
<answer>

Insight:
<1-2 insights>

Recommendations:
- <point 1>
- <point 2>

Keep calculations in the backend. You should only explain, generate insights, and suggest actions.`;

  const userPrompt = `User Query: "${query}"\nResponse Type: "${responseType || 'detailed'}"\nData: ${JSON.stringify(data)}`;

  return await callOpenRouter(systemPrompt, userPrompt);
}

module.exports = {
  classifyIntent,
  generateFinalResponse
};
