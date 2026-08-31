import OpenAI from "openai";
import { RetrievalPlan } from "../types/planner";
import { PLANNER_PROMPT } from "../llmPrompts/plannerPrompt";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function createPlan(
  userQuestion: string,
  nlu: any
): Promise<RetrievalPlan> {

  const completion =
    await client.chat.completions.create({

      model: "openai/gpt-4o-mini",

temperature: 0,

max_tokens: 800,

response_format: {
  type: "json_object"
},

      messages: [

        {
          role: "system",
          content: PLANNER_PROMPT
        },

        {
          role: "user",
          content: `
Create an execution-ready retrieval plan.

The Retrieval Engine will execute ONLY the JSON plan.

Use the NLU output as the primary understanding of the user's request.

Do not answer the user.

User Question:
${userQuestion}

NLU Output:
${JSON.stringify(nlu, null, 2)}

Return a JSON object containing:

- goal
- intent
- reasoning
- entities
- collections
- fields
- semanticSearch
- requiresComparison
- requiresReasoning
- outputFormat
- confidence
- retrievalPlan

Optional fields may include:

- filters
- projection
- sort
- limit

Important:

1. Preserve the user's entity from the NLU when available.
2. Do not invent entities.
3. Do not invent database values.
4. Select only the collections necessary to answer the request.
5. Use QuoteLine for price, specification, quantity, and target price.
6. Use Vendor for vendor information.
7. Use Product for product master information.
8. Use Quote for quote information.
9. Use Order for order information.
10. Use reasoning when comparison, analysis, or recommendation is required.
11. Always provide retrievalPlan.
12. Return ONLY valid JSON.
`
        }

      ]

    });

  const json =
    completion.choices[0]?.message?.content || "{}";

  console.log(
    "========== PLANNER =========="
  );

  console.log(json);

  console.log(
    "============================="
  );

  const result =
    JSON.parse(json);

  if (
    !result.intent ||
    !Array.isArray(result.retrievalPlan)
  ) {

    throw new Error(
      "Invalid retrieval plan returned by planner"
    );

  }

  return result;
}