import OpenAI from "openai";
import { ReasoningResult } from "../types/reasoning";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function runReasoner(
  question: string,
  evidence: any,
  plan: any
): Promise<ReasoningResult> {

  // No evidence -> don't ask the LLM
  const totalRecords =
    (evidence.products?.length ?? 0) +
    (evidence.vendors?.length ?? 0) +
    (evidence.quotes?.length ?? 0) +
    (evidence.orders?.length ?? 0) +
    (evidence.quoteLines?.length ?? 0) +
    (evidence.reports?.length ?? 0) +
    (evidence.comparison?.length ?? 0);

  if (totalRecords === 0) {

    return {
      answer: "No matching information was found in Firestore.",
      reasoning: [
        "The retrieval pipeline did not return any supporting evidence."
      ],
      confidence: 0,
      evidenceUsed: 0,
      citations: []
    };

  }
  
  console.log("========== EVIDENCE ==========");
console.log(JSON.stringify(evidence, null, 2));
console.log("==============================");

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
          content: `
You are Catalogix Procurement AI.

You are a reasoning agent.

You NEVER retrieve data.

You NEVER guess.

You NEVER hallucinate.

Use ONLY the supplied evidence.
The evidence may contain:

products → Product master information

vendors → Vendor master information

quotes → Quote header information

quoteLines → Product specifications, prices, quantities and target prices inside procurement quotes

reports → Procurement report summaries

comparison → Vendor comparison results

Use every available evidence collection when answering.

If the evidence does not contain the answer,
reply exactly:

"I don't have enough evidence."

Do NOT invent:

- Products
- Vendors
- Prices
- Specifications
- Quote Numbers
- Quantities

When comparing vendors or procurement reports,
base every conclusion only on the evidence.

Return ONLY JSON.
`
        },

        {
          role: "user",
          content: `
Planner:
${JSON.stringify(plan, null, 2)}

Evidence:
${JSON.stringify(evidence, null, 2)}

Question:
${question}

Return this JSON format:

{
  "answer":"",
  "reasoning":[],
  "confidence":0.0,
  "evidenceUsed":0,
  "citations":[]
}
`
        }

      ]

    });

  return JSON.parse(
    completion.choices[0].message.content ?? "{}"
  );

}