import OpenAI from "openai";

export type LLMProvider = "gemini";

// ============================================================
// GET CURRENT LLM PROVIDER
//
// Catalogix uses Gemini as the only LLM provider.
// ============================================================

export function getLLMProvider(): LLMProvider {

  const provider =
    (
      process.env.LLM_PROVIDER ||
      "gemini"
    )
      .trim()
      .toLowerCase();

  if (provider !== "gemini") {

    console.warn(
      `Invalid LLM_PROVIDER "${provider}". Falling back to Gemini.`
    );

  }

  return "gemini";
}

// ============================================================
// GET LLM CLIENT
// ============================================================

export function getLLMClient(): OpenAI {

  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {

    throw new Error(
      "GEMINI_API_KEY is not configured."
    );

  }

  return new OpenAI({

    baseURL:
      "https://generativelanguage.googleapis.com/v1beta/openai/",

    apiKey,

  });

}

// ============================================================
// GET MODEL
// ============================================================

export function getLLMModel(
  type:
    | "default"
    | "procurement" = "default"
): string {

  if (type === "procurement") {

    return (
      process.env.GEMINI_PROCUREMENT_MODEL ||
      process.env.GEMINI_MODEL ||
      "gemini-3.5-flash"
    );

  }

  return (
    process.env.GEMINI_MODEL ||
    "gemini-3.5-flash-lite"
  );

}

// ============================================================
// LOG PROVIDER
// ============================================================

export function logLLMProvider(
  type:
    | "default"
    | "procurement" = "default"
) {

  console.log(
    "===================================="
  );

  console.log(
    "LLM PROVIDER:",
    getLLMProvider()
  );

  console.log(
    "LLM MODEL:",
    getLLMModel(type)
  );

  console.log(
    "===================================="
  );

}