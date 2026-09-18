import { adminDb } from "@/lib/firebase-admin";

function normalize(value: any = ""): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function retrieveQuoteLineProducts(
  productName: string,
  fields: string[] = [],
  intent?: string
) {
  const searchName = normalize(productName);

  console.log(
    "SEARCH PRODUCT:",
    searchName || "(ALL PRODUCTS)"
  );

  const snapshot = await adminDb
    .collection("quotes")
    .get();

  const matches: any[] = [];

  // ============================================================
  // NORMALIZE REQUESTED FIELDS
  // ============================================================

  const normalizedFields = fields.map((field) =>
    normalize(field)
  );

  // ============================================================
  // SEARCH MODE
  // ============================================================

  const isVendorComparison =
    intent === "COMPARE_VENDORS";

  const searchAllQuoteLines =
    !searchName &&
    (
      intent === "COMPARE_VENDORS" ||
      intent === "PROCUREMENT_ANALYSIS" ||
      intent === "SHOW_ALL_QUOTES"
    );

  // ============================================================
  // FIELD SELECTION
  // ============================================================

  const wantsAll =
    normalizedFields.includes("*");

  const wantsSpecification =
    wantsAll ||
    normalizedFields.includes("specification") ||
    normalizedFields.includes("specvalue");

  /*
   * IMPORTANT:
   *
   * Vendor comparison ALWAYS needs UnitPrice.
   *
   * Even if NLU/planner accidentally sends:
   *
   * ["Rating"]
   *
   * we still retrieve UnitPrice because vendor comparison
   * cannot determine the cheapest/best-price vendor without it.
   */
  const wantsPrice =
    isVendorComparison ||
    wantsAll ||
    normalizedFields.includes("price") ||
    normalizedFields.includes("unitprice");

  const wantsQuantity =
    wantsAll ||
    normalizedFields.includes("quantity") ||
    isVendorComparison;

  const wantsTargetPrice =
    wantsAll ||
    normalizedFields.includes("targetprice") ||
    normalizedFields.includes("target price");

  // ============================================================
  // READ ALL QUOTES
  // ============================================================

  snapshot.forEach((doc) => {
    const quote = doc.data();

    const quoteInfo =
      quote?.QuoteInfo?.[0];

    if (!quoteInfo) {
      return;
    }

    const quoteType =
      normalize(quoteInfo?.QuoteType);

    /*
     * Master quotes are not vendors.
     *
     * For vendor comparison, don't send Master Quote lines
     * into the comparison data.
     */
    if (
      isVendorComparison &&
      quoteType === "master"
    ) {
      return;
    }

    const qlines =
      Array.isArray(quoteInfo?.Qlines)
        ? quoteInfo.Qlines
        : [];

    qlines.forEach(
      (item: any, lineIndex: number) => {
        const itemProductName =
          String(
            item?.ProductName || ""
          ).trim();

        const normalizedProductName =
          normalize(itemProductName);

        // ========================================================
        // PRODUCT MATCH
        // ========================================================

        const productMatches =
          Boolean(searchName) &&
          normalizedProductName === searchName;

        // ========================================================
        // ALL QUOTE LINES
        // ========================================================

        const includeForComparison =
          searchAllQuoteLines;

        if (
          !productMatches &&
          !includeForComparison
        ) {
          return;
        }

        // ========================================================
        // BUILD BASE RECORD
        // ========================================================

        const record: any = {
          quoteId:
            quoteInfo?.QuoteId ||
            doc.id ||
            "",

          quoteNumber:
            quoteInfo?.QuoteNumber ||
            "",

          quoteType:
            quoteInfo?.QuoteType ||
            "",

          vendor:
            quoteInfo?.VendorName ||
            "",

          VendorName:
            quoteInfo?.VendorName ||
            "",

          ProductName:
            itemProductName,

          lineIndex
        };

        // ========================================================
        // SPECIFICATION
        // ========================================================

        if (
          fields.length === 0 ||
          wantsSpecification ||
          isVendorComparison
        ) {
          record.specValue =
            item?.specValue ??
            item?.Specification ??
            item?.SpecificationValue ??
            null;
        }

        // ========================================================
        // UNIT PRICE
        // ========================================================

        if (
          fields.length === 0 ||
          wantsPrice
        ) {
          record.UnitPrice =
            item?.UnitPrice ??
            item?.unitPrice ??
            item?.Price ??
            null;
        }

        // ========================================================
        // QUANTITY
        // ========================================================

        if (
          fields.length === 0 ||
          wantsQuantity
        ) {
          record.Quantity =
            item?.Quantity ??
            item?.quantity ??
            null;
        }

        // ========================================================
        // TARGET PRICE
        // ========================================================

        if (
          fields.length === 0 ||
          wantsTargetPrice
        ) {
          record.TargetPrice =
            item?.TargetPrice ??
            item?.targetPrice ??
            null;
        }

        matches.push(record);
      }
    );
  });

  // ============================================================
  // DEDUPLICATE
  // ============================================================

  const unique =
    Array.from(
      new Map(
        matches.map(
          (record: any) => {
            const key =
              [
                record.quoteId || "",
                record.ProductName || "",
                record.UnitPrice ?? "",
                record.Quantity ?? "",
                record.lineIndex ?? ""
              ].join("|");

            return [
              key,
              record
            ];
          }
        )
      ).values()
    );

  console.log(
    "QUOTE LINE MATCHES:",
    unique.length
  );

  // ============================================================
  // DEBUG VENDOR COMPARISON
  // ============================================================

  if (isVendorComparison) {
    console.log(
      "================================="
    );

    console.log(
      "VENDOR COMPARISON QUOTE LINES"
    );

    console.log(
      JSON.stringify(
        unique,
        null,
        2
      )
    );

    console.log(
      "================================="
    );
  }

  return {
    products: unique
  };
}