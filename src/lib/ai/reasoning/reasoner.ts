
import { ReasoningResult } from "../types/reasoning";

import {
  getLLMClient,
  getLLMModel,
  logLLMProvider,
} from "../llmProvider";

export async function runReasoner(
  question: string,
  evidence: any,
  plan: any
): Promise<ReasoningResult> {

  // ============================================================
  // 1. CHECK WHETHER EVIDENCE EXISTS
  // ============================================================

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

  console.log(
    "========== REASONER =========="
  );

  console.log(
    "Intent:",
    plan.intent
  );

  console.log(
    "Reasoning:",
    plan.reasoning
  );

  console.log(
    "Evidence Records:",
    totalRecords
  );

  console.log(
    "==============================="
  );


  // ============================================================
  // 2. SIMPLE LIST / LOOKUP REQUESTS
  //
  // DO NOT CALL LLM
  // ============================================================

  if (
    plan.requiresReasoning === false &&
    plan.requiresComparison === false
  ) {

    // ----------------------------------------------------------
    // SHOW ALL VENDORS
    // ----------------------------------------------------------

    if (
      plan.intent === "SHOW_ALL_VENDORS"
    ) {

      const answer =
        evidence.vendors
          .map(
            (vendor: any, index: number) => {

              const name =
                vendor.Name ||
                vendor.Vendor ||
                vendor.vendorName ||
                "Not Available";

              const status =
                vendor.Status ||
                "Not Available";

              const phone =
                vendor.Phone ||
                "Not Available";

              const email =
                vendor.Email ||
                "Not Available";

              return (
                `${index + 1}. ${name}\n` +
                `   Status: ${status}\n` +
                `   Phone: ${phone}\n` +
                `   Email: ${email}`
              );

            }
          )
          .join("\n\n");


      return {

        answer,

        reasoning: [
          "The vendors were retrieved directly from Firestore."
        ],

        confidence: 1,

        evidenceUsed:
          evidence.vendors.length,

        citations: [
          "Firestore: Vendor"
        ]

      };

    }


    // ----------------------------------------------------------
    // SHOW ALL PRODUCTS
    // ----------------------------------------------------------

    if (
      plan.intent === "SHOW_ALL_PRODUCTS"
    ) {

      const answer =
        evidence.products
          .map(
            (product: any, index: number) => {

              const name =
                product.name ||
                product.productName ||
                "Not Available";

              const productId =
                product.productId ||
                product.id ||
                "Not Available";

              const brand =
                product.brand ||
                product.Brand ||
                "Not Available";

              const category =
                product.category ||
                product.Category ||
                "Not Available";

              return (
                `${index + 1}. ${name}\n` +
                `   Product ID: ${productId}\n` +
                `   Brand: ${brand}\n` +
                `   Category: ${category}`
              );

            }
          )
          .join("\n\n");


      return {

        answer,

        reasoning: [
          "The products were retrieved directly from Firestore."
        ],

        confidence: 1,

        evidenceUsed:
          evidence.products.length,

        citations: [
          "Firestore: Product"
        ]

      };

    }


    // ----------------------------------------------------------
    // SHOW ALL ORDERS
    // ----------------------------------------------------------

    if (
      plan.intent === "SHOW_ALL_ORDERS"
    ) {

      const answer =
        evidence.orders
          .map(
            (order: any, index: number) => {

              const orderId =
                order.orderId ||
                order.id ||
                "Not Available";

              const status =
                order.Status ||
                order.status ||
                "Not Available";

              return (
                `${index + 1}. Order: ${orderId}\n` +
                `   Status: ${status}`
              );

            }
          )
          .join("\n\n");


      return {

        answer,

        reasoning: [
          "The orders were retrieved directly from Firestore."
        ],

        confidence: 1,

        evidenceUsed:
          evidence.orders.length,

        citations: [
          "Firestore: Order"
        ]

      };

    }


    // ----------------------------------------------------------
    // SHOW ALL QUOTES
    // ----------------------------------------------------------

    if (
      plan.intent === "SHOW_ALL_QUOTES"
    ) {

      const answer =
        evidence.quotes
          .map(
            (quote: any, index: number) => {

              const info =
                quote?.QuoteInfo?.[0] || {};

              const quoteNumber =
                info.QuoteNumber ||
                "Not Available";

              const quoteType =
                info.QuoteType ||
                "Not Available";

              const vendor =
                info.VendorName ||
                "Not Available";

              return (
                `${index + 1}. Quote Number: ${quoteNumber}\n` +
                `   Quote Type: ${quoteType}\n` +
                `   Vendor: ${vendor}`
              );

            }
          )
          .join("\n\n");


      return {

        answer,

        reasoning: [
          "The quotes were retrieved directly from Firestore."
        ],

        confidence: 1,

        evidenceUsed:
          evidence.quotes.length,

        citations: [
          "Firestore: Quote"
        ]

      };

    }

  }


  // ============================================================
  // 3. LLM REASONING
  //
  // Only use the LLM when actual reasoning is required.
  // ============================================================

  console.log(
    "Calling LLM reasoning engine..."
  );


  const client =
  getLLMClient();

const model =
  getLLMModel("default");

logLLMProvider("default");


  const completion =
    await client.chat.completions.create({

    model,

      temperature: 0,

      max_tokens: 800,

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

quoteLines → Product specifications, prices, quantities and target prices

reports → Procurement report summaries

comparison → Vendor comparison results

Use only the evidence provided.

If the evidence does not contain the answer,
say:

"I don't have enough evidence."

Never invent:

- Products
- Vendors
- Prices
- Specifications
- Quote Numbers
- Quantities

When comparing vendors or procurement information,
base every conclusion only on the supplied evidence.

Return ONLY valid JSON.
`
        },

        {

          role: "user",

          content: `
Planner:

${JSON.stringify(
  plan,
  null,
  2
)}

Evidence:

${JSON.stringify(
  evidence,
  null,
  2
)}

Question:

${question}

Return:

{
  "answer": "",
  "reasoning": [],
  "confidence": 0,
  "evidenceUsed": 0,
  "citations": []
}
`
        }

      ]

    });


  const content =
    completion
      .choices[0]
      ?.message
      ?.content;


  if (!content) {

    return {

      answer:
        "I don't have enough evidence.",

      reasoning: [
        "The reasoning model did not return a response."
      ],

      confidence: 0,

      evidenceUsed:
        totalRecords,

      citations: []

    };

  }


  return JSON.parse(content);

}