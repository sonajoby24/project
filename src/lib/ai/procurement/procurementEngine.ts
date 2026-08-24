import { generateMasterQuoteReport } from "./masterQuoteReport";
import { runProcurementAgent } from "./procurementAgent";

export async function runProcurementAnalysis(
  quotes: any[],
  selectedQuote?: any
) {
  console.log(
    "===================================="
  );

  console.log(
    "BUILDING PROCUREMENT EVIDENCE"
  );

  console.log(
    "Quotes:",
    quotes.length
  );

  console.log(
    "===================================="
  );

  // ------------------------------------------------------------
  // 1. BUILD FACTUAL PROCUREMENT EVIDENCE
  //
  // masterQuoteReport is the canonical source for:
  // - master products
  // - vendor matches
  // - quantities
  // - target prices
  // - vendor prices
  // - price differences
  // - missing products
  // - extra products
  // - cheapest vendor
  // - combined cost
  // ------------------------------------------------------------

  const procurementEvidence =
    generateMasterQuoteReport(
      quotes,
      selectedQuote
    );

  console.log(
    "PROCUREMENT EVIDENCE:"
  );

  console.log(
    JSON.stringify(
      procurementEvidence,
      null,
      2
    )
  );

  // ------------------------------------------------------------
  // 2. SEND FACTUAL EVIDENCE TO GEMINI
  //
  // Gemini does NOT calculate the values.
  // Gemini reasons over the evidence.
  // ------------------------------------------------------------

  let aiAnalysis = null;

  try {

    aiAnalysis =
      await runProcurementAgent(
        procurementEvidence
      );

  } catch (error) {

    console.error(
      "Gemini Procurement Agent Error:",
      error
    );

    /*
     * Do not destroy the factual procurement report
     * if Gemini fails.
     *
     * The deterministic evidence is still valid.
     */

    aiAnalysis = null;
  }

  // ------------------------------------------------------------
  // 3. RETURN BOTH LAYERS
  // ------------------------------------------------------------

  return {

    evidence:
      procurementEvidence,

    aiAnalysis,

    /*
     * Keep this for compatibility with
     * existing code that may expect
     * procurement.masterAnalysis etc.
     */

    masterAnalysis:
      procurementEvidence,

  };
}