import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY!
);

export async function generateAIResponse(
  prompt: string
) {
  try {

    const model =
      genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

    const result =
      await model.generateContent(prompt);

    return result.response.text();

  } catch (error) {

    console.error(
      "Gemini Error:",
      error
    );

    throw error;
  }
}