import { adminDb } from "@/lib/firebase-admin";

function normalize(value: any = ""): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function clean(value: any = ""): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getQuoteInfo(quote: any): any {
  /*
   * Normal quotes structure:
   * QuoteInfo: [
   *   {
   *     QuoteId,
   *     QuoteNumber,
   *     QuoteType,
   *     VendorName,
   *     ParentQuoteID,
   *     Qlines
   *   }
   * ]
   */

  if (
    Array.isArray(quote?.QuoteInfo) &&
    quote.QuoteInfo.length > 0
  ) {
    return quote.QuoteInfo[0] ?? {};
  }

  /*
   * quotess can contain the quote information directly
   * at document level.
   */
  return quote ?? {};
}

function getQuoteId(quote: any): string {
  const info = getQuoteInfo(quote);

  return clean(
    info?.QuoteId ??
      info?.QuoteID ??
      info?.quoteId ??
      quote?.QuoteId ??
      quote?.QuoteID ??
      quote?.quoteId ??
      quote?.id ??
      ""
  );
}

function getQuoteNumber(quote: any): string {
  const info = getQuoteInfo(quote);

  return clean(
    info?.QuoteNumber ??
      info?.quoteNumber ??
      quote?.QuoteNumber ??
      quote?.quoteNumber ??
      ""
  );
}

function getQuoteType(quote: any): string {
  const info = getQuoteInfo(quote);

  return normalize(
    info?.QuoteType ??
      info?.quoteType ??
      quote?.QuoteType ??
      quote?.quoteType ??
      ""
  );
}

function getParentQuoteId(quote: any): string {
  const info = getQuoteInfo(quote);

  return clean(
    info?.ParentQuoteID ??
      info?.ParentQuoteId ??
      info?.parentQuoteId ??
      info?.ParentQuote ??
      quote?.ParentQuoteID ??
      quote?.ParentQuoteId ??
      quote?.parentQuoteId ??
      quote?.ParentQuote ??
      ""
  );
}

function getQuoteName(quote: any): string {
  const info = getQuoteInfo(quote);

  return clean(
    info?.QuoteName ??
      info?.quoteName ??
      quote?.QuoteName ??
      quote?.quoteName ??
      ""
  );
}

function getVendorName(quote: any): string {
  const info = getQuoteInfo(quote);

  return clean(
    info?.VendorName ??
      info?.vendorName ??
      info?.Vendor ??
      info?.vendor ??
      quote?.VendorName ??
      quote?.vendorName ??
      quote?.Vendor ??
      quote?.vendor ??
      ""
  );
}

function isMasterQuote(quote: any): boolean {
  return getQuoteType(quote) === "master";
}

function isChildOf(
  quote: any,
  masterQuoteId: string
): boolean {
  if (!masterQuoteId) {
    return false;
  }

  return (
    getParentQuoteId(quote) ===
    masterQuoteId
  );
}

/**
 * Extract quote lines from different Firestore structures.
 *
 * Normal quotes:
 *   QuoteInfo[0].Qlines
 *
 * Some quotess documents:
 *   Qlines
 *   QuoteLines
 *   qlines
 *   quoteLines
 *
 * If the document itself represents one quote line,
 * create a single-line array from the document.
 */

function getQuoteLines(quote: any): any[] {
  const info = getQuoteInfo(quote);

  // ============================================================
  // POSSIBLE QUOTE-LINE FIELDS
  // ============================================================

  const possibleValues = [
    info?.Qlines,
    info?.QuoteLines,
    info?.qlines,
    info?.quoteLines,

    quote?.Qlines,
    quote?.QuoteLines,
    quote?.qlines,
    quote?.quoteLines,
  ];

  // ============================================================
  // NORMALIZE ONE QUOTE LINE
  // ============================================================

  function normalizeLine(line: any): any {
    return {
      ...line,

      ProductName:
        line?.ProductName ??
        line?.productName ??
        line?.Name ??
        line?.name ??
        "",

      Quantity:
        line?.Quantity ??
        line?.quantity ??
        "",

      // IMPORTANT:
      // quotess Firestore uses QuotedPrice
      // Report system can use UnitPrice
      UnitPrice:
        line?.UnitPrice ??
        line?.unitPrice ??
        line?.QuotedPrice ??
        line?.quotedPrice ??
        line?.Price ??
        line?.price ??
        "",

      QuotedPrice:
        line?.QuotedPrice ??
        line?.quotedPrice ??
        line?.UnitPrice ??
        line?.unitPrice ??
        line?.Price ??
        line?.price ??
        "",

      specValue:
        line?.specValue ??
        line?.SpecValue ??
        line?.Specification ??
        line?.specification ??
        line?.Spec ??
        line?.spec ??
        "",
    };
  }

  // ============================================================
  // ARRAY STRUCTURE
  // ============================================================

  for (const value of possibleValues) {
    if (Array.isArray(value)) {
      return value.map(normalizeLine);
    }
  }

  // ============================================================
  // OBJECT / MAP STRUCTURE
  //
  // Some quotess documents store quote lines like:
  //
  // {
  //   "0": {...},
  //   "1": {...},
  //   "2": {...}
  // }
  //
  // instead of:
  //
  // [
  //   {...},
  //   {...}
  // ]
  // ============================================================

  for (const value of possibleValues) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const entries = Object.values(value);

      const validLines = entries.filter(
        (line: any) =>
          line &&
          typeof line === "object" &&
          (
            line?.ProductName !== undefined ||
            line?.productName !== undefined ||
            line?.Quantity !== undefined ||
            line?.quantity !== undefined ||
            line?.QuotedPrice !== undefined ||
            line?.quotedPrice !== undefined ||
            line?.UnitPrice !== undefined ||
            line?.unitPrice !== undefined ||
            line?.specValue !== undefined ||
            line?.Specification !== undefined
          )
      );

      if (validLines.length > 0) {
        return validLines.map(normalizeLine);
      }
    }
  }

  // ============================================================
  // SINGLE QUOTE-LINE DOCUMENT
  // ============================================================

  const hasProduct =
    quote?.ProductName !== undefined ||
    quote?.productName !== undefined ||
    info?.ProductName !== undefined ||
    info?.productName !== undefined;

  if (hasProduct) {
    return [
      normalizeLine({
        ProductName:
          quote?.ProductName ??
          quote?.productName ??
          info?.ProductName ??
          info?.productName,

        Quantity:
          quote?.Quantity ??
          quote?.quantity ??
          info?.Quantity ??
          info?.quantity,

        UnitPrice:
          quote?.UnitPrice ??
          quote?.unitPrice ??
          quote?.QuotedPrice ??
          quote?.quotedPrice ??
          info?.UnitPrice ??
          info?.unitPrice ??
          info?.QuotedPrice ??
          info?.quotedPrice,

        QuotedPrice:
          quote?.QuotedPrice ??
          quote?.quotedPrice ??
          info?.QuotedPrice ??
          info?.quotedPrice,

        specValue:
          quote?.specValue ??
          quote?.SpecValue ??
          quote?.Specification ??
          quote?.specification ??
          info?.specValue ??
          info?.SpecValue ??
          info?.Specification ??
          info?.specification,
      }),
    ];
  }

  return [];
}


/**
 * Convert quotess documents into the same usable structure
 * expected by the existing report generators.
 *
 * IMPORTANT:
 * No fake values are added.
 * Existing Firestore values are preserved.
 */
function normalizeQuoteDocument(
  doc: any,
  collectionName: string
): any {
  const info = getQuoteInfo(doc);

  const quoteInfo = {
    ...info,

    QuoteId:
      info?.QuoteId ??
      info?.QuoteID ??
      info?.quoteId ??
      doc?.QuoteId ??
      doc?.QuoteID ??
      doc?.quoteId ??
      doc?.id ??
      "",

    QuoteNumber:
      info?.QuoteNumber ??
      info?.quoteNumber ??
      doc?.QuoteNumber ??
      doc?.quoteNumber ??
      "",

    QuoteName:
      info?.QuoteName ??
      info?.quoteName ??
      doc?.QuoteName ??
      doc?.quoteName ??
      "",

    QuoteType:
      info?.QuoteType ??
      info?.quoteType ??
      doc?.QuoteType ??
      doc?.quoteType ??
      "",

    VendorName:
      info?.VendorName ??
      info?.vendorName ??
      info?.Vendor ??
      info?.vendor ??
      doc?.VendorName ??
      doc?.vendorName ??
      doc?.Vendor ??
      doc?.vendor ??
      "",

    ParentQuoteID:
      info?.ParentQuoteID ??
      info?.ParentQuoteId ??
      info?.parentQuoteId ??
      info?.ParentQuote ??
      doc?.ParentQuoteID ??
      doc?.ParentQuoteId ??
      doc?.parentQuoteId ??
      doc?.ParentQuote ??
      "",

    Qlines: getQuoteLines(doc),
  };

  return {
    ...doc,

    /*
     * Keep original collection information for debugging
     * and traceability.
     */
    _sourceCollection: collectionName,

    QuoteInfo: [quoteInfo],
  };
}

export async function retrieveQuotes(
  plan: any
) {
const quoteEntity =
  clean(
    plan?.entities?.quote ||
    plan?.entities?.Quote ||
    plan?.entityName ||
    plan?.quoteNumber ||
    ""
  );

console.log(
  "========== QUOTE DEBUG =========="
);

console.log(
  "FULL PLAN:",
  JSON.stringify(plan, null, 2)
);

console.log(
  "QUOTE ENTITY:",
  quoteEntity
);

console.log(
  "================================="
);

  console.log(
    "===================================="
  );

  console.log(
    "QUOTE RETRIEVAL"
  );

  console.log(
    "QUOTE ENTITY FROM PLANNER:",
    quoteEntity
  );

  console.log(
    "===================================="
  );

  const data: any = {
    quotes: [],
    selectedQuote: null,
    masterQuote: null,
    childQuotes: [],
  };

  // ============================================================
  // LOAD FROM "quotes"
  // ============================================================

  const quotesSnapshot =
    await adminDb
      .collection("quotes")
      .get();

  const quotes: any[] =
    quotesSnapshot.docs.map(
      (doc) =>
        normalizeQuoteDocument(
          {
            id: doc.id,
            ...doc.data(),
          },
          "quotes"
        )
    );

  // ============================================================
  // LOAD FROM "quotess"
  // ============================================================

  const quotessSnapshot =
    await adminDb
      .collection("quotess")
      .get();

  const quotess: any[] =
    quotessSnapshot.docs.map(
      (doc) =>
        normalizeQuoteDocument(
          {
            id: doc.id,
            ...doc.data(),
          },
          "quotess"
        )
    );

  // ============================================================
  // COMBINE BOTH COLLECTIONS
  // ============================================================

  /*
   * Keep actual Firestore data.
   *
   * If the same QuoteId exists in both collections,
   * use one record instead of duplicating it.
   */

  const quoteMap =
    new Map<string, any>();

  for (const quote of [
    ...quotes,
    ...quotess,
  ]) {
    const quoteId =
      getQuoteId(quote);

    const quoteNumber =
      getQuoteNumber(quote);

    const key =
      quoteId ||
      quoteNumber ||
      `${quote._sourceCollection}:${quote.id}`;

    /*
     * quotess is allowed to provide the actual quote
     * when the same quote exists there.
     */
    quoteMap.set(
      key,
      quote
    );
  }

  const allQuotes =
    Array.from(
      quoteMap.values()
    );

  console.log(
    "QUOTES COLLECTION:",
    quotes.length
  );

  console.log(
    "QUOTESS COLLECTION:",
    quotess.length
  );

  console.log(
    "TOTAL UNIQUE QUOTES:",
    allQuotes.length
  );

  allQuotes.forEach(
    (quote: any) => {
      const info =
        getQuoteInfo(quote);

      console.log(
        "QUOTE:",
        getQuoteNumber(quote),
        "| ID:",
        getQuoteId(quote),
        "| TYPE:",
        getQuoteType(quote),
        "| VENDOR:",
        getVendorName(quote),
        "| SOURCE:",
        quote._sourceCollection
      );
    }
  );

  // ============================================================
  // SHOW ALL QUOTES
  // ============================================================

  if (
    plan?.intent ===
    "SHOW_ALL_QUOTES"
  ) {
    data.quotes =
      allQuotes;

    return data;
  }

  // ============================================================
  // FIND SELECTED QUOTE
  // ============================================================

  let selectedQuote: any =
    null;

  // ============================================================
  // SEARCH BY QUOTE NUMBER
  // ============================================================


// ============================================================
// SEARCH BY QUOTE NUMBER
// ============================================================

// Support:
// 83
// 82
// 00000083
// 00000082
// quote 83
// quote 00000083
// quote number 00000083

const numberMatch =
  quoteEntity.match(
    /\b(\d{1,8})\b/
  );

if (numberMatch) {
  const normalizedNumber =
    numberMatch[1].padStart(
      8,
      "0"
    );

  console.log(
    "SEARCHING QUOTE NUMBER:",
    normalizedNumber
  );

  selectedQuote =
    allQuotes.find(
      (quote: any) =>
        getQuoteNumber(
          quote
        ) ===
        normalizedNumber
    );

  if (selectedQuote) {
    console.log(
      "QUOTE FOUND BY NUMBER:",
      normalizedNumber
    );
  }
}

  // ============================================================
  // SEARCH BY QUOTE ID
  // ============================================================

  if (!selectedQuote) {
    const quoteIdMatch =
      quoteEntity.match(
        /^0Q0[a-zA-Z0-9]+$/
      );

    if (quoteIdMatch) {
      const quoteId =
        quoteIdMatch[0];

      console.log(
        "SEARCHING QUOTE ID:",
        quoteId
      );

      selectedQuote =
        allQuotes.find(
          (quote: any) =>
            getQuoteId(
              quote
            ) ===
            quoteId
        );
    }
  }

  // ============================================================
  // QUOTE NOT FOUND
  // ============================================================

  if (!selectedQuote) {
    console.log(
      "QUOTE NOT FOUND:",
      quoteEntity
    );

    return data;
  }

  const selectedInfo =
    getQuoteInfo(
      selectedQuote
    );

  const selectedQuoteId =
    getQuoteId(
      selectedQuote
    );

  const selectedQuoteNumber =
    getQuoteNumber(
      selectedQuote
    );

  console.log(
    "SELECTED QUOTE:",
    selectedInfo
  );

  console.log(
    "SELECTED QUOTE ID:",
    selectedQuoteId
  );

  console.log(
    "SELECTED QUOTE NUMBER:",
    selectedQuoteNumber
  );

  console.log(
    "SELECTED QUOTE SOURCE:",
    selectedQuote._sourceCollection
  );

  data.selectedQuote =
    selectedQuote;

  // ============================================================
  // MASTER QUOTE
  // ============================================================

  if (
    isMasterQuote(
      selectedQuote
    )
  ) {
    const masterQuoteId =
      selectedQuoteId;

    /*
     * Only children whose ParentQuoteID points to
     * this exact Master Quote are included.
     */

    const childQuotes =
      allQuotes.filter(
        (quote: any) =>
          !isMasterQuote(
            quote
          ) &&
          isChildOf(
            quote,
            masterQuoteId
          )
      );

    data.masterQuote =
      selectedQuote;

    data.childQuotes =
      childQuotes;

    data.quotes = [
      selectedQuote,
      ...childQuotes,
    ];

    console.log(
      "SELECTED MASTER QUOTE:",
      masterQuoteId
    );

    console.log(
      "CHILD QUOTES FOUND:",
      childQuotes.length
    );

    childQuotes.forEach(
      (quote: any) => {
        console.log(
          "CHILD QUOTE:",
          getQuoteNumber(
            quote
          ),
          "| TYPE:",
          getQuoteType(
            quote
          ),
          "| VENDOR:",
          getVendorName(
            quote
          ),
          "| PARENT:",
          getParentQuoteId(
            quote
          ),
          "| SOURCE:",
          quote._sourceCollection
        );
      }
    );

    return data;
  }

  // ============================================================
  // TRANSACTIONAL / CHILD QUOTE
  // ============================================================

  const parentQuoteId =
    getParentQuoteId(
      selectedQuote
    );

  console.log(
    "TRANSACTIONAL QUOTE PARENT ID:",
    parentQuoteId
  );

  if (parentQuoteId) {
    /*
     * Find the exact parent Master Quote
     * across BOTH collections.
     */

    const masterQuote =
      allQuotes.find(
        (quote: any) =>
          isMasterQuote(
            quote
          ) &&
          getQuoteId(
            quote
          ) ===
          parentQuoteId
      );

    if (!masterQuote) {
      console.error(
        "PARENT MASTER QUOTE NOT FOUND:",
        parentQuoteId
      );

      data.quotes = [
        selectedQuote,
      ];

      return data;
    }

    data.masterQuote =
      masterQuote;

    data.childQuotes = [
      selectedQuote,
    ];

    data.quotes = [
      masterQuote,
      selectedQuote,
    ];

    console.log(
      "PARENT MASTER QUOTE:",
      getQuoteNumber(
        masterQuote
      )
    );

    console.log(
      "PARENT MASTER SOURCE:",
      masterQuote._sourceCollection
    );

    console.log(
      "TRANSACTIONAL QUOTE:",
      selectedQuoteNumber
    );

    console.log(
      "TRANSACTIONAL SOURCE:",
      selectedQuote._sourceCollection
    );

    return data;
  }

  // ============================================================
  // TRANSACTIONAL QUOTE WITHOUT PARENT
  // ============================================================

  data.quotes = [
    selectedQuote,
  ];

  console.warn(
    "TRANSACTIONAL QUOTE DOES NOT HAVE A PARENT MASTER QUOTE:",
    selectedQuoteId
  );

  return data;
}