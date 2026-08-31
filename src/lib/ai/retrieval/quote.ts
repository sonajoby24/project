import { adminDb } from "@/lib/firebase-admin";

export async function retrieveQuotes(
  plan: any
) {
  const quoteEntity =
    String(plan.entities?.quote || "").trim();

  console.log(
    "QUOTE ENTITY FROM PLANNER:",
    quoteEntity
  );

  const data: any = {
    quotes: []
  };

  // ============================================================
  // LOAD ALL QUOTES
  // ============================================================

  const snapshot =
    await adminDb
      .collection("quotes")
      .get();

  const quotes: any[] =
    snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));


  // ============================================================
  // SHOW ALL QUOTES
  // ============================================================

  if (
    plan.intent === "SHOW_ALL_QUOTES"
  ) {

    data.quotes = quotes;

    return data;
  }


  // ============================================================
  // SEARCH BY QUOTE NUMBER
  // ============================================================

  const quoteNumberMatch =
    quoteEntity.match(/^\d{8}$/);


  if (quoteNumberMatch) {

    const quoteNumber =
      quoteNumberMatch[0];

    console.log(
      "SEARCHING QUOTE NUMBER:",
      quoteNumber
    );


    // ----------------------------------------------------------
    // Find selected quote
    // ----------------------------------------------------------

    const selectedQuote =
      quotes.find(
        (quote: any) =>
          String(
            quote?.QuoteInfo?.[0]?.QuoteNumber
          ) === quoteNumber
      );


    if (!selectedQuote) {

      console.log(
        "QUOTE NOT FOUND:",
        quoteNumber
      );

      return data;
    }


    const selectedInfo =
      selectedQuote?.QuoteInfo?.[0];


    const selectedQuoteId =
      selectedInfo?.QuoteId;


    const parentQuoteId =
      selectedInfo?.ParentQuoteID;


    console.log(
      "SELECTED QUOTE:",
      selectedInfo
    );

    console.log(
      "SELECTED QUOTE ID:",
      selectedQuoteId
    );

    console.log(
      "PARENT QUOTE ID:",
      parentQuoteId
    );


    // ==========================================================
    // MASTER QUOTE
    // ==========================================================

    if (
      selectedInfo?.QuoteType === "Master"
    ) {

      const relatedQuotes =
        quotes.filter(
          (quote: any) => {

            const info =
              quote?.QuoteInfo?.[0];

            return (
              info?.QuoteId === selectedQuoteId ||
              info?.ParentQuoteID === selectedQuoteId
            );
          }
        );


      data.quotes =
        relatedQuotes;


      console.log(
        "MASTER PROCUREMENT QUOTES:",
        relatedQuotes.length
      );


      return data;
    }


    // ==========================================================
    // TRANSACTIONAL QUOTE
    // Find:
    // 1. Master quote
    // 2. All vendor quotes belonging to master
    // ==========================================================

    if (parentQuoteId) {

      const relatedQuotes =
        quotes.filter(
          (quote: any) => {

            const info =
              quote?.QuoteInfo?.[0];

            if (!info) {
              return false;
            }


            const isMaster =
              info?.QuoteId === parentQuoteId;


            const isVendorQuote =
              info?.ParentQuoteID === parentQuoteId;


            return (
              isMaster ||
              isVendorQuote
            );
          }
        );


      data.quotes =
        relatedQuotes;


      console.log(
        "PROCUREMENT QUOTES FOUND:",
        relatedQuotes.length
      );


      relatedQuotes.forEach(
        (quote: any) => {

          const info =
            quote?.QuoteInfo?.[0];

          console.log(
            "QUOTE:",
            info?.QuoteNumber,
            "| TYPE:",
            info?.QuoteType,
            "| VENDOR:",
            info?.VendorName
          );
        }
      );


      return data;
    }


    // ==========================================================
    // NO PARENT QUOTE
    // ==========================================================

    data.quotes =
      [selectedQuote];

    return data;
  }


  // ============================================================
  // SEARCH BY QUOTE ID
  // ============================================================

  const quoteIdMatch =
    quoteEntity.match(/^0Q0[a-zA-Z0-9]+$/);


  if (quoteIdMatch) {

    const quoteId =
      quoteIdMatch[0];


    const selectedQuote =
      quotes.find(
        (quote: any) => {

          const info =
            quote?.QuoteInfo?.[0];

          return (
            info?.QuoteId === quoteId
          );
        }
      );


    if (!selectedQuote) {
      return data;
    }


    const selectedInfo =
      selectedQuote?.QuoteInfo?.[0];


    const parentQuoteId =
      selectedInfo?.ParentQuoteID;


    // ----------------------------------------------------------
    // MASTER QUOTE
    // ----------------------------------------------------------

    if (
      selectedInfo?.QuoteType === "Master"
    ) {

      data.quotes =
        quotes.filter(
          (quote: any) => {

            const info =
              quote?.QuoteInfo?.[0];

            return (
              info?.QuoteId === quoteId ||
              info?.ParentQuoteID === quoteId
            );
          }
        );


      return data;
    }


    // ----------------------------------------------------------
    // TRANSACTIONAL QUOTE
    // ----------------------------------------------------------

    if (parentQuoteId) {

      data.quotes =
        quotes.filter(
          (quote: any) => {

            const info =
              quote?.QuoteInfo?.[0];

            return (
              info?.QuoteId === parentQuoteId ||
              info?.ParentQuoteID === parentQuoteId
            );
          }
        );


      return data;
    }


    data.quotes =
      [selectedQuote];

    return data;
  }


  // ============================================================
  // NO QUOTE IDENTIFIER
  // ============================================================

  return data;
}