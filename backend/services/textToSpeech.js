import axios from "axios";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

// 🔥 keep same function name
function cleanTextForSpeech(text) {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\*\*/g, "")
    .replace(/###/g, "")
    .replace(/[-•]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function textToSpeech(text) {
  if (!text || typeof text !== "string" || !text.trim()) {
    console.warn("TTS skipped: empty text");
    return null;
  }

  const cleanedText = cleanTextForSpeech(text);

  try {
    const response = await axios.post(
      "https://api.sarvam.ai/text-to-speech",
      {
        text: cleanedText.trim(), // 🔥 ONLY CHANGE (THIS FIX)
        target_language_code: "ta-IN",
        speaker: "karun",
        pitch: 0,
        pace: 0.95,
        loudness: 1.0,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
      },
      {
        headers: {
          "api-subscription-key": SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const base64Audio = response.data.audios?.[0];

    if (!base64Audio) {
      console.warn("Sarvam TTS returned empty audio");
      return null;
    }

    return Buffer.from(base64Audio, "base64");

  } catch (err) {
    console.error("Sarvam error:", err.response?.data || err.message);
    return null;
  }
}