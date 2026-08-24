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
You are creating an execution plan.

Return:

Goal

Intent

Entities

Collections

Projection

Filters

Reasoning

Output Format

Retrieval Plan

The Retrieval Engine will never inspect the original question.

Your JSON must contain everything required to answer the question.
User Question:
${userQuestion}

NLU Output:

${JSON.stringify(nlu, null, 2)}

Use the NLU output as the primary understanding of the user's request.

Generate:

- Goal
- Intent
- Entities
- Collections
- Fields
- semanticSearch
- requiresComparison
- requiresReasoning
- outputFormat
- confidence
- retrievalPlan

Return ONLY JSON.
`
}

      ]

    });

  const json =
    completion.choices[0].message.content || "{}";

  console.log("========== PLANNER ==========");
console.log(json);
console.log("=============================");

  return JSON.parse(json);

}