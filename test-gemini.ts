import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config({
  path: ".env.local",
});

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log("GEMINI KEY PRESENT:", Boolean(apiKey));

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Reply with exactly: Gemini connection successful",
    });

    console.log("GEMINI RESPONSE:");
    console.log(response.text);

  } catch (error) {
    console.error("GEMINI TEST ERROR:");
    console.error(error);
  }
}

testGemini();