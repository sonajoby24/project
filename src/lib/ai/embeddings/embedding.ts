import { GoogleGenAI } from "@google/genai";

// ============================================================
// CREATE GEMINI EMBEDDING
//
// Catalogix uses Gemini for embeddings.
// OpenRouter is not used.
// ============================================================

export async function createEmbedding(
  text: string
): Promise<number[]> {

  console.log(
    "================================="
  );

  console.log(
    "EMBEDDING PROVIDER: gemini"
  );

  console.log(
    "================================="
  );

  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {

    throw new Error(
      "GEMINI_API_KEY is not configured."
    );

  }

  const ai =
    new GoogleGenAI({
      apiKey
    });

  const model =
    process.env.GEMINI_EMBEDDING_MODEL ||
    "gemini-embedding-2";

  const outputDimensionality =
    Number(
      process.env.GEMINI_EMBEDDING_DIMENSION ||
      "1536"
    );

  const response =
    await ai.models.embedContent({

      model,

      contents: text,

      config: {

        outputDimensionality

      }

    });

  const embedding =
    response.embeddings?.[0]?.values;

  if (
    !embedding ||
    embedding.length === 0
  ) {

    throw new Error(
      "Gemini embedding response was empty."
    );

  }

  console.log(
    "Gemini embedding dimension:",
    embedding.length
  );

  return embedding;

}