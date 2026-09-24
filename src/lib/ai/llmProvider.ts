import OpenAI from "openai";

export type LLMProvider =
  | "gemini"
  | "openrouter";

// ============================================================
// GET CURRENT LLM PROVIDER
// ============================================================

export function getLLMProvider(): LLMProvider {

  const provider =
    (
      process.env.LLM_PROVIDER ||
      "gemini"
    )
      .trim()
      .toLowerCase();

  if (
    provider !== "gemini" &&
    provider !== "openrouter"
  ) {

    console.warn(
      `Invalid LLM_PROVIDER "${provider}". Falling back to Gemini.`
    );

    return "gemini";
  }

  return provider as LLMProvider;
}

// ============================================================
// GET LLM CLIENT
// ============================================================

export function getLLMClient(): OpenAI {

  const provider =
    getLLMProvider();

  // ==========================================================
  // GEMINI
  // ==========================================================

  if (provider === "gemini") {

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

  // ==========================================================
  // OPENROUTER
  // ==========================================================

  const apiKey =
    process.env.OPENROUTER_API_KEY;

  if (!apiKey) {

    throw new Error(
      "OPENROUTER_API_KEY is not configured."
    );

  }

  return new OpenAI({

    baseURL:
      "https://openrouter.ai/api/v1",

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

  const provider =
    getLLMProvider();

  // ==========================================================
  // GEMINI MODELS
  // ==========================================================

  if (provider === "gemini") {

    if (
      type === "procurement"
    ) {

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

  // ==========================================================
  // OPENROUTER MODELS
  // ==========================================================

  if (
    type === "procurement"
  ) {

    return (
      process.env.OPENROUTER_PROCUREMENT_MODEL ||
      process.env.OPENROUTER_MODEL ||
      "openai/gpt-4o-mini"
    );

  }

  return (
    process.env.OPENROUTER_MODEL ||
    "openai/gpt-4o-mini"
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