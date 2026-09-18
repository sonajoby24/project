import { generateMasterQuoteReport } from "./masterQuoteReport";
import { generateTransactionalQuoteReport } from "./transactionalQuoteReport";
import { runProcurementAgent } from "./procurementAgent";

function normalize(value: any = ""): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getQuoteInfo(
  quote: any
): any {
  return quote?.QuoteInfo?.[0] ?? {};
}

function getQuoteId(
  quote: any
): string {
  return String(
    getQuoteInfo(quote)?.QuoteId ||
      quote?.id ||
      ""
  ).trim();
}

function getQuoteType(
  quote: any
): string {
  return normalize(
    getQuoteInfo(quote)?.QuoteType
  );
}

function getParentQuoteId(
  quote: any
): string {
  const info =
    getQuoteInfo(quote);

  return String(
    info?.ParentQuoteID ||
      info?.ParentQuoteId ||
      info?.parentQuoteId ||
      info?.ParentQuote ||
      ""
  ).trim();
}

function isMasterQuote(
  quote: any
): boolean {
  return (
    getQuoteType(quote) ===
    "master"
  );
}

export async function runProcurementAnalysis(
  quotes: any[],
  selectedQuote?: any
) {
  const safeQuotes =
    Array.isArray(quotes)
      ? quotes
      : [];

  if (
    safeQuotes.length === 0
  ) {
    throw new Error(
      "No procurement quotes were retrieved from Firebase."
    );
  }

  /*
   * ------------------------------------------------------------
   * SELECTED QUOTE
   * ------------------------------------------------------------
   *
   * The selected quote must be the quote the user asked about.
   *
   * We intentionally do NOT choose the first Master Quote from
   * the retrieved data because Firestore may contain multiple
   * Master Quotes.
   */

  let actualSelectedQuote =
    selectedQuote || null;

  /*
   * If selectedQuote was not explicitly passed, try to use the
   * exact quote that is identifiable in the retrieved dataset.
   *
   * This is only a fallback and never chooses an arbitrary
   * Master Quote.
   */

  if (
    !actualSelectedQuote &&
    safeQuotes.length === 1
  ) {
    actualSelectedQuote =
      safeQuotes[0];
  }

  if (
    !actualSelectedQuote
  ) {
    throw new Error(
      "The selected procurement quote was not provided."
    );
  }

  const selectedInfo =
    getQuoteInfo(
      actualSelectedQuote
    );

  const quoteType =
    normalize(
      selectedInfo?.QuoteType
    );

  const selectedQuoteId =
    getQuoteId(
      actualSelectedQuote
    );

  console.log(
    "===================================="
  );

  console.log(
    "BUILDING PROCUREMENT EVIDENCE"
  );

  console.log(
    "Quotes:",
    safeQuotes.length
  );

  console.log(
    "Selected Quote:",
    selectedInfo
  );

  console.log(
    "Selected Quote ID:",
    selectedQuoteId
  );

  console.log(
    "PROCUREMENT QUOTE TYPE:",
    quoteType
  );

  console.log(
    "===================================="
  );

  /*
   * ============================================================
   * MASTER QUOTE REPORT
   * ============================================================
   *
   * The selected Master Quote must be compared against ALL of
   * its actual child/vendor quotes.
   */

  let procurementEvidence: any;

  if (
    quoteType === "master"
  ) {
    const masterQuote =
      safeQuotes.find(
        (quote: any) =>
          isMasterQuote(quote) &&
          getQuoteId(quote) ===
            selectedQuoteId
      );

    if (!masterQuote) {
      throw new Error(
        "Selected Master Quote could not be found in the retrieved Firestore data."
      );
    }

    const masterQuoteId =
      getQuoteId(
        masterQuote
      );

    /*
     * IMPORTANT:
     *
     * Only children belonging to this exact Master Quote are
     * passed into the Master report.
     *
     * No unrelated vendor quotation is included.
     */

    const childQuotes =
      safeQuotes.filter(
        (quote: any) =>
          !isMasterQuote(quote) &&
          getParentQuoteId(
            quote
          ) === masterQuoteId
      );

    /*
     * The report generator receives:
     *
     * Master Quote
     * +
     * ALL child/vendor quotes
     */

    const masterAndChildren = [
      masterQuote,
      ...childQuotes
    ];

    procurementEvidence =
      generateMasterQuoteReport(
        masterAndChildren,
        masterQuote
      );
  } else {
    /*
     * ==========================================================
     * TRANSACTIONAL QUOTE REPORT
     * ==========================================================
     *
     * The selected transactional quote must point to its parent
     * Master Quote using ParentQuoteID.
     */

    const parentQuoteId =
      getParentQuoteId(
        actualSelectedQuote
      );

    if (!parentQuoteId) {
      throw new Error(
        "The selected transactional quote does not contain a ParentQuoteID."
      );
    }

    /*
     * Find the EXACT parent Master Quote.
     */

    const masterQuote =
      safeQuotes.find(
        (quote: any) =>
          isMasterQuote(quote) &&
          getQuoteId(quote) ===
            parentQuoteId
      );

    if (!masterQuote) {
      throw new Error(
        `Parent Master Quote not found for transactional quote. ParentQuoteID: ${parentQuoteId}`
      );
    }

    /*
     * Make sure the selected quote itself is used.
     *
     * We do not compare it against every vendor quote because
     * this is a transactional report.
     */

    const transactionalQuote =
      safeQuotes.find(
        (quote: any) =>
          getQuoteId(quote) ===
          selectedQuoteId
      );

    if (!transactionalQuote) {
      throw new Error(
        "Selected transactional quote could not be found in the retrieved Firestore data."
      );
    }

    procurementEvidence =
      generateTransactionalQuoteReport(
        masterQuote,
        transactionalQuote
      );
  }

  /*
   * ============================================================
   * VALIDATE EVIDENCE
   * ============================================================
   */

  if (
    !procurementEvidence
  ) {
    throw new Error(
      "Procurement evidence could not be generated."
    );
  }

  /*
   * ============================================================
   * AI ANALYSIS
   * ============================================================
   *
   * The AI receives ONLY the factual evidence generated from
   * Firestore data.
   */

  let aiAnalysis = null;

  try {
    aiAnalysis =
      await runProcurementAgent(
        procurementEvidence
      );
  } catch (error) {
    console.error(
      "Procurement AI Agent Error:",
      error
    );

    /*
     * Factual evidence remains available even if AI fails.
     */

    aiAnalysis = null;
  }

  /*
   * ============================================================
   * FINAL RESULT
   * ============================================================
   */

  return {
    evidence:
      procurementEvidence,

    aiAnalysis,

    /*
     * Kept for compatibility with the existing UI.
     */
    masterAnalysis:
      procurementEvidence
  };
}