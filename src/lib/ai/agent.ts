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

import { SYSTEM_PROMPT } from "./prompts";

import { retrieveEvidence } from "./retrieval/retrieval";

import {
  ChatMessage,
  formatConversationHistory,
} from "./memory";

import {
  getLLMClient,
  getLLMModel,
  logLLMProvider,
} from "./llmProvider";

// ============================================================
// CLEAN VALUE
// ============================================================

function clean(value: any): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// NUMBER VALUE
// ============================================================

function numberValue(
  value: any
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(
    String(value).replace(/[^0-9.-]/g, "")
  );

  return Number.isFinite(number)
    ? number
    : null;
}

// ============================================================
// DIRECT QUOTELINE ANSWER
//
// Used for factual product-field questions.
//
// Examples:
// - What is the specification of Resistor?
// - What is the unit price of Header?
// - What is the quantity of Header?
// - What is the target price of Header?
//
// These answers come directly from retrieved Firebase QuoteLine
// records instead of asking the LLM to calculate or invent them.
// ============================================================

function formatQuoteLineProductAnswer(
  question: string,
  quoteLines: any[]
): string | null {

  if (
    !Array.isArray(quoteLines) ||
    quoteLines.length === 0
  ) {
    return null;
  }

  const q = clean(question).toLowerCase();

  const asksSpecification =
    q.includes("specification") ||
    q.includes("spec value") ||
    q.includes("specvalue");

  const asksUnitPrice =
    q.includes("unit price") ||
    q.includes("unitprice") ||
    q.includes("price");

  const asksQuantity =
    q.includes("quantity") ||
    q.includes("qty");

  const asksTargetPrice =
    q.includes("target price") ||
    q.includes("targetprice");

  if (
    !asksSpecification &&
    !asksUnitPrice &&
    !asksQuantity &&
    !asksTargetPrice
  ) {
    return null;
  }

  // ==========================================================
  // BUILD RECORDS FROM FIREBASE QUOTE LINES
  // ==========================================================

  const records = quoteLines
    .filter(
      (line: any) =>
        clean(
          line?.ProductName ||
          line?.product ||
          line?.name
        )
    )
    .map(
      (line: any) => ({
        product: clean(
          line?.ProductName ||
          line?.product ||
          line?.name
        ),

        specification: clean(
          line?.specValue ??
          line?.Specification ??
          line?.specification
        ),

        unitPrice:
          line?.UnitPrice ??
          line?.unitPrice ??
          line?.Price ??
          null,

        quantity:
          line?.Quantity ??
          line?.quantity ??
          null,

        targetPrice:
          line?.TargetPrice ??
          line?.targetPrice ??
          null,

        vendor: clean(
          line?.VendorName ??
          line?.vendor
        ),

        quoteNumber: clean(
          line?.quoteNumber ??
          line?.QuoteNumber
        ),

        quoteType: clean(
          line?.quoteType ??
          line?.QuoteType
        ),
      })
    );

  if (records.length === 0) {
    return null;
  }

  // ==========================================================
  // REMOVE DUPLICATES
  // ==========================================================

  const unique = Array.from(
    new Map(
      records.map(
        (record: any) => [
          [
            record.product,
            record.specification,
            record.unitPrice,
            record.quantity,
            record.targetPrice,
            record.vendor,
            record.quoteNumber,
          ].join("|"),

          record,
        ]
      )
    ).values()
  );

  // ==========================================================
  // SPECIFICATION
  // ==========================================================

  if (asksSpecification) {

    const lines = unique.map(
      (record: any) => {

        let output =
          `Product : ${record.product}\n`;

        output +=
          `Specification : ${
            record.specification ||
            "Not Available"
          }\n`;

        if (record.vendor) {
          output +=
            `Vendor : ${record.vendor}\n`;
        }

        if (record.quoteNumber) {
          output +=
            `Quote Number : ${record.quoteNumber}\n`;
        }

        if (record.quoteType) {
          output +=
            `Quote Type : ${record.quoteType}\n`;
        }

        return output;
      }
    );

    return lines.join("\n");
  }

  // ==========================================================
  // UNIT PRICE
  // ==========================================================

  if (asksUnitPrice) {

    const lines = unique.map(
      (record: any) => {

        const price =
          numberValue(
            record.unitPrice
          );

        let output =
          `Product : ${record.product}\n`;

        output +=
          `Unit Price : ${
            price !== null
              ? price.toFixed(2)
              : "Not Available"
          }\n`;

        if (record.specification) {
          output +=
            `Specification : ${record.specification}\n`;
        }

        if (record.vendor) {
          output +=
            `Vendor : ${record.vendor}\n`;
        }

        if (record.quoteNumber) {
          output +=
            `Quote Number : ${record.quoteNumber}\n`;
        }

        if (record.quoteType) {
          output +=
            `Quote Type : ${record.quoteType}\n`;
        }

        return output;
      }
    );

    return lines.join("\n");
  }

  // ==========================================================
  // QUANTITY
  // ==========================================================

  if (asksQuantity) {

    const lines = unique.map(
      (record: any) => {

        let output =
          `Product : ${record.product}\n`;

        output +=
          `Quantity : ${
            record.quantity ??
            "Not Available"
          }\n`;

        if (record.specification) {
          output +=
            `Specification : ${record.specification}\n`;
        }

        if (record.vendor) {
          output +=
            `Vendor : ${record.vendor}\n`;
        }

        if (record.quoteNumber) {
          output +=
            `Quote Number : ${record.quoteNumber}\n`;
        }

        return output;
      }
    );

    return lines.join("\n");
  }

  // ==========================================================
  // TARGET PRICE
  // ==========================================================

  if (asksTargetPrice) {

    const lines = unique.map(
      (record: any) => {

        const target =
          numberValue(
            record.targetPrice
          );

        let output =
          `Product : ${record.product}\n`;

        output +=
          `Target Price : ${
            target !== null
              ? target.toFixed(2)
              : "Not Available"
          }\n`;

        if (record.specification) {
          output +=
            `Specification : ${record.specification}\n`;
        }

        if (record.vendor) {
          output +=
            `Vendor : ${record.vendor}\n`;
        }

        return output;
      }
    );

    return lines.join("\n");
  }

  return null;
}

// ============================================================
// MAIN AGENT
// ============================================================

export async function runAgent(
  userMessage: string,
  history: ChatMessage[]
) {

  try {

    // ==========================================================
    // 1. REWRITE + NLU
    // ==========================================================

    const rewrittenQuery =
      rewriteQuery(userMessage);

    const nlu =
      await understandQuestion(
        userMessage
      );

    // ==========================================================
    // 2. CREATE EXECUTION PLAN
    // ==========================================================

    const plan =
      await createPlan(
        rewrittenQuery,
        nlu
      );

    console.log(
      "=============================="
    );

    console.log("NLU:");
    console.log(nlu);

    console.log("PLAN:");
    console.log(plan);

    console.log(
      "=============================="
    );

    // ==========================================================
    // 3. RETRIEVE FIREBASE EVIDENCE
    // ==========================================================

    let databaseData: any =
      await retrieveEvidence(
        rewrittenQuery,
        plan
      );

    // ==========================================================
    // 4. RANK RESULTS
    // ==========================================================

    databaseData =
      rankResults(
        databaseData
      );

    // ==========================================================
    // 5. PROCUREMENT ANALYSIS
    // ==========================================================

    if (
      databaseData.intent ===
        "PROCUREMENT_ANALYSIS" &&
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

      // --------------------------------------------------------
      // Extract quote number
      // --------------------------------------------------------

      const quoteNumberMatch =
        userMessage.match(
          /\b\d{1,8}\b/
        ) ||
        rewrittenQuery.match(
          /\b\d{1,8}\b/
        );

      const rawQuoteNumber =
        quoteNumberMatch?.[0];

      // Normalize:
      //
      // 80       -> 00000080
      // 74       -> 00000074
      // 00000080 -> 00000080

      const requestedQuoteNumber =
        rawQuoteNumber
          ? rawQuoteNumber.padStart(
              8,
              "0"
            )
          : undefined;

      const selectedQuote =
        databaseData.quotes.find(
          (q: any) => {

            const quoteNumber =
              clean(
                q?.QuoteInfo?.[0]
                  ?.QuoteNumber
              ).padStart(
                8,
                "0"
              );

            return (
              quoteNumber ===
              requestedQuoteNumber
            );
          }
        );

      console.log(
        "REQUESTED QUOTE NUMBER:",
        requestedQuoteNumber
      );

      console.log(
        "SELECTED QUOTE:",
        selectedQuote?.QuoteInfo?.[0]
      );

      console.log(
        "===================================="
      );

      console.log(
        "QUOTES SENT TO PROCUREMENT ENGINE:"
      );

      databaseData.quotes.forEach(
        (q: any) => {

          const info =
            q?.QuoteInfo?.[0];

          console.log({
            quoteNumber:
              info?.QuoteNumber,

            quoteType:
              info?.QuoteType,

            vendor:
              info?.VendorName,

            quoteId:
              info?.QuoteId,

            parentQuoteId:
              info?.ParentQuoteID,
          });
        }
      );

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

    // ==========================================================
    // 6. VALIDATE FIREBASE EVIDENCE
    // ==========================================================

    const validation =
      validateResults(
        databaseData
      );

    const hasFirebaseEvidence =
      (
        Array.isArray(
          databaseData.products
        ) &&
        databaseData.products.length > 0
      ) ||

      (
        Array.isArray(
          databaseData.vendors
        ) &&
        databaseData.vendors.length > 0
      ) ||

      (
        Array.isArray(
          databaseData.quotes
        ) &&
        databaseData.quotes.length > 0
      ) ||

      (
        Array.isArray(
          databaseData.orders
        ) &&
        databaseData.orders.length > 0
      ) ||

      (
        Array.isArray(
          databaseData.quoteLines
        ) &&
        databaseData.quoteLines.length > 0
      ) ||

      Boolean(
        databaseData.procurement
      );

    if (
      !validation.valid &&
      !hasFirebaseEvidence
    ) {

      return (
        "No matching information was found in Firebase."
      );
    }

    // ==========================================================
// DIRECT ALL PRODUCTS RESPONSE
// ==========================================================
if (databaseData.intent === "SHOW_ALL_PRODUCTS") {

  const products = Array.isArray(databaseData.products)
    ? databaseData.products
    : [];

  if (products.length === 0) {
    return "No products were found in Firebase.";
  }

  return products
    .map((product: any, index: number) => {

      const name =
        product?.ProductName ??
        product?.productName ??
        product?.Name ??
        product?.name ??
        "Unknown Product";

      const id =
        product?.ProductID ??
        product?.productId ??
        product?.ProductId ??
        product?.ID ??
        "N/A";

      const brand =
        product?.Brand ??
        product?.brand ??
        "N/A";

      const category =
        product?.Category ??
        product?.category ??
        "N/A";

      return `${index + 1}. ${name} Product ID: ${id} Brand: ${brand} Category: ${category}`;
    })
    .join("\n");
}

// ==========================================================
// DIRECT ALL VENDORS RESPONSE
// ==========================================================
if (databaseData.intent === "SHOW_ALL_VENDORS") {

  const vendors = Array.isArray(databaseData.vendors)
    ? databaseData.vendors
    : [];

  if (vendors.length === 0) {
    return "No vendors were found in Firebase.";
  }

  return vendors
    .map((vendor: any, index: number) => {

      const name =
        vendor?.VendorName ??
        vendor?.vendorName ??
        vendor?.Name ??
        vendor?.name ??
        "Unknown Vendor";

      const id =
        vendor?.VendorID ??
        vendor?.vendorId ??
        vendor?.VendorId ??
        vendor?.ID ??
        "N/A";

      const rating =
        vendor?.Rating ??
        vendor?.rating ??
        "N/A";

      return `${index + 1}. ${name} Vendor ID: ${id} Rating: ${rating}`;
    })
    .join("\n");
}

    // ==========================================================
    // 7. PROCUREMENT AI RESPONSE
    // ==========================================================

    if (
      databaseData.intent ===
        "PROCUREMENT_ANALYSIS" &&
      databaseData.procurement
    ) {

      console.log(
        "Returning Procurement Analysis"
      );

      if (
        databaseData.procurement
          .aiAnalysis
      ) {

        return JSON.stringify(
          databaseData.procurement
            .aiAnalysis,
          null,
          2
        );
      }

      return JSON.stringify(
        databaseData.procurement
          .evidence ||
        databaseData.procurement
          .masterAnalysis ||
        {},
        null,
        2
      );
    }

    // ==========================================================
    // 8. VENDOR COMPARISON
    // ==========================================================

    if (
      databaseData.intent ===
      "COMPARE_VENDORS"
    ) {

      const comparison =
        databaseData.comparison;

      console.log(
        "===================================="
      );

      console.log(
        "VENDOR COMPARISON"
      );

      console.log(
        "COMPARISON DATA:",
        JSON.stringify(
          comparison,
          null,
          2
        )
      );

      console.log(
        "===================================="
      );

      // --------------------------------------------------------
      // Comparison can be:
      //
      // 1. Rating object
      // 2. Price comparison object
      // 3. Multi-criteria object
      // 4. Legacy array
      // --------------------------------------------------------

      const hasComparison =
        comparison &&
        (
          Array.isArray(
            comparison
          )
            ? comparison.length > 0
            : typeof comparison ===
                "object" &&
              Object.keys(
                comparison
              ).length > 0
        );

      if (
        hasComparison
      ) {

        return formatVendorComparison(
          comparison,
          userMessage
        );
      }
    }

    // ==========================================================
    // 9. DIRECT QUOTELINE PRODUCT QUESTIONS
    // ==========================================================

    const directQuoteLineAnswer =
      formatQuoteLineProductAnswer(
        userMessage,
        databaseData.quoteLines
      );

    if (
      directQuoteLineAnswer
    ) {

      console.log(
        "RETURNING DIRECT QUOTELINE ANSWER"
      );

      return directQuoteLineAnswer;
    }

    // ==========================================================
    // 10. NORMAL FIREBASE QUESTIONS
    // ==========================================================

    if (
      databaseData.products?.length ||
      databaseData.vendors?.length ||
      databaseData.quotes?.length ||
      databaseData.orders?.length ||
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

    // ==========================================================
    // 11. GENERIC AI FALLBACK
    // ==========================================================

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
        databaseData?.products
          ?.length || 0,

      vendors:
        databaseData?.vendors
          ?.length || 0,

      quotes:
        databaseData?.quotes
          ?.length || 0,

      orders:
        databaseData?.orders
          ?.length || 0,

      quoteLines:
        databaseData?.quoteLines
          ?.length || 0,

      intent:
        databaseData?.intent ||
        "UNKNOWN",
    };

    console.log(
      "DATABASE SENT TO AI:",
      databaseString
    );

const client =
  getLLMClient();

const model =
  getLLMModel("default");

logLLMProvider("default");

    const completion =
      await client.chat.completions.create({

       model,

        max_tokens:
          1000,

        messages: [

          {
            role:
              "system",

            content:
              SYSTEM_PROMPT,
          },

          {
            role:
              "user",

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
specifications, quote numbers, ratings,
or other values.

3. If multiple matching records exist,
present them as a bullet list or table.

4. Never merge different product specifications.

5. Mention Quote Number and Quote Type
whenever available.

6. Show Product Name, Specification,
Quantity, Unit Price, and Target Price
for matching records when those fields
are available.

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

  } catch (
    error: any
  ) {

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