import { adminDb } from "@/lib/firebase-admin";

export async function retrieveQuoteLineProducts(
  productName: string,
  fields: string[] = [],
  intent?: string
) {

  const searchName =
    productName
      .trim()
      .toLowerCase();

  console.log(
    "SEARCH PRODUCT:",
    searchName || "(ALL PRODUCTS)"
  );

  const snapshot =
    await adminDb
      .collection("quotes")
      .get();

  const matches: any[] = [];

  // ============================================================
  // DETERMINE SEARCH MODE
  // ============================================================

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

  const normalizedFields =
    fields.map(
      (field) =>
        field.toLowerCase()
    );

  const wantsSpecification =
    normalizedFields.includes(
      "specification"
    ) ||
    normalizedFields.includes(
      "specvalue"
    );

  const wantsPrice =
    normalizedFields.includes(
      "price"
    ) ||
    normalizedFields.includes(
      "unitprice"
    );

  const wantsQuantity =
    normalizedFields.includes(
      "quantity"
    );

  const wantsTargetPrice =
    normalizedFields.includes(
      "targetprice"
    ) ||
    normalizedFields.includes(
      "target price"
    );


  // ============================================================
  // READ ALL QUOTE LINES
  // ============================================================

  snapshot.forEach((doc) => {

    const quote =
      doc.data();

    const quoteInfo =
      quote?.QuoteInfo?.[0];

    const qlines =
      quoteInfo?.Qlines || [];


    qlines.forEach((item: any) => {

      const itemProductName =
        String(
          item.ProductName || ""
        ).trim();

      const normalizedProductName =
        itemProductName.toLowerCase();


      // ========================================================
      // PRODUCT MATCH
      // ========================================================

      const productMatches =
        searchName &&
        normalizedProductName.includes(
          searchName
        );


      // ========================================================
      // ALL QUOTE LINES FOR COMPARISON
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
      // BUILD RECORD
      // ========================================================

      const record: any = {

        quoteId:
          quoteInfo?.QuoteId,

        quoteNumber:
          quoteInfo?.QuoteNumber,

        quoteType:
          quoteInfo?.QuoteType,

        vendor:
          quoteInfo?.VendorName,

        VendorName:
          quoteInfo?.VendorName,

        ProductName:
          itemProductName

      };


      // ========================================================
      // RETURN REQUESTED FIELDS
      // ========================================================

      if (
        fields.length === 0 ||
        wantsSpecification
      ) {

        record.specValue =
          item.specValue;

      }


      if (
        fields.length === 0 ||
        wantsPrice
      ) {

        record.UnitPrice =
          item.UnitPrice;

      }


      if (
        fields.length === 0 ||
        wantsQuantity
      ) {

        record.Quantity =
          item.Quantity;

      }


      if (
        fields.length === 0 ||
        wantsTargetPrice
      ) {

        record.TargetPrice =
          item.TargetPrice;

      }


      matches.push(
        record
      );

    });

  });


  // ============================================================
  // REMOVE DUPLICATES
  // ============================================================

  const unique =
    Array.from(
      new Map(
        matches.map(
          (record: any) => [

            `${record.quoteId || ""}|` +
            `${record.ProductName || ""}|` +
            `${record.UnitPrice || ""}`,

            record

          ]
        )
      ).values()
    );


  console.log(
    "QUOTE LINE MATCHES:",
    unique.length
  );


  return {

    products: unique

  };

}