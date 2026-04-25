const axios = require("axios");

const API_KEY = process.env.AICREDITS_API_KEY;

async function testAPI() {
    try {
        const res = await axios.post(
            "https://api.aicredits.in/v1/chat/completions",
            {
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "user", content: "Say hello in one line" }
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("Response:\n", JSON.stringify(res.data, null, 2));
    } catch (err) {
        if (err.response) {
            console.error("API Error:", err.response.status);
            console.error(err.response.data);
        } else {
            console.error("Error:", err.message);
        }
    }
}

testAPI();