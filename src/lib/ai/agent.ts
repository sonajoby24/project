import { rewriteQuery } from "./queryRewriter";
import { rankResults } from "./ranker";
import { validateResults } from "./validator";
import { buildContext } from "./contextBuilder";
import { formatAnswer } from "./answerFormatter";
import { understandQuestion } from "./nlu";
import { formatVendorComparison } from "./vendorComparisonFormatter";

import { runProcurementAnalysis } from "./procurement/procurementEngine";

import { createPlan } from "./planner/planner";
import { runReasoner } from "./reasoning/reasoner";

import OpenAI from "openai";

import { SYSTEM_PROMPT } from "./prompts";

import { retrieveEvidence } from "./retrieval/retrieval";

import {
  ChatMessage,
  formatConversationHistory,
} from "./memory";


const client = new OpenAI({

  baseURL:
    "https://openrouter.ai/api/v1",

  apiKey:
    process.env.OPENROUTER_API_KEY,

});


export async function runAgent(

  userMessage: string,

  history: ChatMessage[]

) {

  try {

    // ============================================================
    // 1. UNDERSTAND USER QUERY
    // ============================================================

   const rewrittenQuery =
  rewriteQuery(userMessage);

const nlu =
  await understandQuestion(
    userMessage
  );


    // ============================================================
    // 2. CREATE EXECUTION PLAN
    // ============================================================

    const plan =
      await createPlan(
        rewrittenQuery,
        nlu
      );


    console.log(
      "=============================="
    );

    console.log(
      "NLU:"
    );

    console.log(
      nlu
    );

    console.log(
      "PLAN:"
    );

    console.log(
      plan
    );

    console.log(
      "=============================="
    );


    // ============================================================
    // 3. RETRIEVE FIREBASE EVIDENCE
    // ============================================================

    let databaseData: any =
      await retrieveEvidence(
        rewrittenQuery,
        plan
      );


    // ============================================================
    // 4. RANK RETRIEVED RESULTS
    // ============================================================

    databaseData =
      rankResults(
        databaseData
      );


    // ============================================================
    // 5. PROCUREMENT INTELLIGENCE
    //
    // IMPORTANT:
    // Only run procurement engine when the user's intent
    // is actually PROCUREMENT_ANALYSIS.
    // ============================================================

    if (

      databaseData.intent ===
      "PROCUREMENT_ANALYSIS"

      &&

      databaseData.quotes?.length

    ) {

      console.log(
        "===================================="
      );

      console.log(
        "STARTING PROCUREMENT ANALYSIS"
      );

      console.log(
        "Quotes:",
        databaseData.quotes.length
      );

      console.log(
        "===================================="
      );


     const selectedQuote =
  databaseData.quotes.find(
    (q: any) =>
      String(q?.QuoteInfo?.[0]?.QuoteNumber) ===
      String(
        rewrittenQuery.match(/\b\d{8}\b/)?.[0]
      )
  );
 
console.log(
  "===================================="
);

console.log(
  "QUOTES SENT TO PROCUREMENT ENGINE:"
);

databaseData.quotes.forEach((q: any) => {

  const info =
    q?.QuoteInfo?.[0];

  console.log({
    quoteNumber: info?.QuoteNumber,
    quoteType: info?.QuoteType,
    vendor: info?.VendorName,
    quoteId: info?.QuoteId,
    parentQuoteId: info?.ParentQuoteID
  });

});

console.log(
  "TOTAL QUOTES:",
  databaseData.quotes.length
);

console.log(
  "===================================="
);  

databaseData.procurement =
  await runProcurementAnalysis(
    databaseData.quotes,
    selectedQuote
  );


      console.log(
        "===================================="
      );

      console.log(
        "PROCUREMENT ANALYSIS COMPLETED"
      );

      console.log(
        JSON.stringify(
          databaseData.procurement,
          null,
          2
        )
      );

      console.log(
        "===================================="
      );

    }


    // ============================================================
    // 6. VALIDATE FIREBASE EVIDENCE
    // ============================================================

    const validation =
      validateResults(
        databaseData
      );


    if (!validation.valid) {

      return (
        "No matching information was found in Firebase."
      );

    }


    // ============================================================
    // 7. PROCUREMENT AI RESPONSE
    //
    // Gemini's output is now returned here.
    // ============================================================

    if (

      databaseData.intent ===
      "PROCUREMENT_ANALYSIS"

      &&

      databaseData.procurement?.aiAnalysis

    ) {

      console.log(
        "Returning Gemini Procurement Analysis"
      );


      return JSON.stringify(

        databaseData.procurement.aiAnalysis,

        null,

        2

      );

    }


    // ============================================================
    // 8. VENDOR COMPARISON
    // ============================================================

    if (

      databaseData.intent ===
      "COMPARE_VENDORS"

      &&

      databaseData.comparison?.length

    ) {

      return formatVendorComparison(

        databaseData.comparison,

        userMessage

      );

    }


    // ============================================================
    // 9. NORMAL FIREBASE QUESTIONS
    // ============================================================

    if (

      databaseData.products?.length

      ||

      databaseData.vendors?.length

      ||

      databaseData.quotes?.length

      ||

      databaseData.orders?.length

      ||

      databaseData.quoteLines?.length

    ) {

      const reasoningResult =
        await runReasoner(

          userMessage,

          databaseData,

          plan

        );


      return reasoningResult.answer;

    }


    // ============================================================
    // 10. GENERIC AI FALLBACK
    // ============================================================

    const conversationHistory =
      formatConversationHistory(
        history
      );


    const context =
      buildContext(
        databaseData
      );


    const databaseString =
      JSON.stringify(
        databaseData,
        null,
        2
      );


    const databaseStats = {

      products:
        databaseData?.products?.length || 0,

      vendors:
        databaseData?.vendors?.length || 0,

      quotes:
        databaseData?.quotes?.length || 0,

      orders:
        databaseData?.orders?.length || 0,

      intent:
        databaseData?.intent ||
        "UNKNOWN",

    };


    console.log(
      "DATABASE SENT TO AI:",
      databaseString
    );


    const completion =
      await client.chat.completions.create({

        model:
          "openai/gpt-3.5-turbo",

        max_tokens:
          1000,

        messages: [

          {

            role: "system",

            content:
              SYSTEM_PROMPT,

          },

          {

            role: "user",

            content: `

You are Catalogix AI.

User Intent:
${databaseStats.intent}

Database Summary:
${JSON.stringify(
  databaseStats,
  null,
  2
)}

Retrieved Firebase Context:
${context}

Conversation:
${conversationHistory}

Current User Question:
${userMessage}

Instructions:

1. Use ONLY the retrieved Firebase records.

2. Never invent products, vendors, prices,
specifications, quote numbers, or other values.

3. If multiple matching records exist,
present them as a bullet list or table.

4. Never merge different product specifications.

5. Mention Quote Number and Quote Type
whenever available.

6. Show Product Name, Specification,
Quantity, Unit Price, and Target Price
for matching records.

7. If Target Price is not available,
write "Target Price: Not Available."

8. If another field is missing,
write "Not Available."

9. If no relevant Firebase records are found,
reply only:

"No matching information was found in Firebase."

10. Do not guess.

11. Explain the retrieved information
clearly and professionally.

`,

          },

        ],

      });


    const answer =
      completion
        .choices[0]
        ?.message
        ?.content
      ||

      "No response generated.";


    return formatAnswer(
      answer
    );


  } catch (error: any) {

    console.error(
      "AI AGENT ERROR:",
      error
    );


    if (
      error?.status === 402
    ) {

      return `

AI service quota exceeded.

The Firebase data is available
and working correctly.

The AI provider rejected the request
because of token/credit limits.

Please try again later or reduce
the amount of data being queried.

`;

    }


    return "AI agent failed.";

  }

}