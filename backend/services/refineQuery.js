import axios from "axios";

const apiKey = process.env.AICREDITS_API_KEY;

export async function refineQuery(message, mode = "toEnglish") {
  if (!apiKey) {
    throw new Error("OPENROUTER API key is not configured");
  }

  let systemPrompt = "";

  // Mode 1: Tamil → English (for search)
  if (mode === "toEnglish") {
    systemPrompt = `
You are a strict translator.

Rules:
- ALWAYS convert input into English.
- If input is Tamil, translate it to English.
- Output must be ONLY English words.
- Do NOT return Tamil.
- Do NOT explain anything.

Examples:
"உங்களிடம் பச்சை குடைமிளகாய் உள்ளதா?" → Do you have green capsicum?
"ஆரோக்கியமான ஸ்நாக்ஸ்" → healthy snacks
`;
  }

  // Mode 2: English → Tamil (for response)
  else if (mode === "toTamil") {
    systemPrompt = `
You are a translator.

Rules:
- Translate the given English text into Tamil.
- Keep it natural and user-friendly.
- Do NOT explain anything.
- Return ONLY Tamil text.
`;
  }
  //https://openrouter.ai/api/v1/chat/completions
  try {
    const response = await axios.post(
      "https://api.aicredits.in/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        }
      }
    );

    const result = response.data.choices[0].message.content.trim();

    console.log("Refined Result:", result);

    return result;

  } catch (error) {
    console.error(
      "OpenRouter refineQuery error:",
      error.response ? error.response.data : error.message
    );

    return message; // fallback
  }
}