import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not configured in .env.local");
}

const ai = new GoogleGenAI({
  apiKey,
});

export async function generateAIResponse(
  prompt: string
): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    return response.text || "";

  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}