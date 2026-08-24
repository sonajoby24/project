function normalize(value: string = ""): string {
  return value
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function money(value: number): number {
  return Number(Number(value || 0).toFixed(2));
}

export function generateMasterQuoteReport(
  quotes: any[],
  selectedQuote?: any
): any {

  const masterQuote = quotes.find(
    q =>
      q?.QuoteInfo?.[0]?.QuoteType === "Master"
  );

  if (!masterQuote) {
    throw new Error("Master Quote not found");
  }

  const masterInfo =
    masterQuote?.QuoteInfo?.[0];

  const masterLines =
    masterInfo?.Qlines || [];

  const vendorQuotes =
    quotes.filter(
      q =>
        q?.QuoteInfo?.[0]?.QuoteType !==
        "Master"
    );

  if (vendorQuotes.length === 0) {
    return {
      mode: "MASTER",

      inputQuoteId:
        selectedQuote?.QuoteInfo?.[0]?.QuoteId ||
        masterInfo?.QuoteId ||
        "",

      selectedQuoteNumber:
        selectedQuote?.QuoteInfo?.[0]?.QuoteNumber ||
        "",

      selectedQuoteName:
        selectedQuote?.QuoteInfo?.[0]?.QuoteName ||
        "",

      selectedQuoteType:
        selectedQuote?.QuoteInfo?.[0]?.QuoteType ||
        "",

      selectedVendor:
        selectedQuote?.QuoteInfo?.[0]?.VendorName ||
        "",

      parentQuoteId:
        masterInfo?.QuoteId ||
        "",

      parentQuoteNumber:
        masterInfo?.QuoteNumber ||
        "",

      parentQuoteName:
        masterInfo?.QuoteName ||
        "",

      quoteId:
        masterInfo?.QuoteId ||
        "",

      quoteName:
        masterInfo?.QuoteName ||
        "",

      quoteNumber:
        masterInfo?.QuoteNumber ||
        "",

      quoteType:
        masterInfo?.QuoteType ||
        "Master",

      totalProducts:
        masterLines.length,

      totalAmount: 0,

      qtyMatchPercentage: 0,

      overallPriceMatchPercentage: 0,

      missingProductCount: 0,

      extraProductCount: 0,

      missingProducts: [],

      extraProducts: [],

      insights: [
        "No vendor quotations available."
      ],

      products: []
    };
  }

  const products: any[] = [];

  const missingProducts: any[] = [];

  const extraProducts: any[] = [];

  /*
   * ============================================================
   * MASTER PRODUCT → COMPARE AGAINST ALL VENDORS
   * ============================================================
   */

  masterLines.forEach((master: any) => {

    const matchingVendors: any[] = [];

    vendorQuotes.forEach((vendorQuote: any) => {

      const vendorInfo =
        vendorQuote?.QuoteInfo?.[0];

      if (!vendorInfo) return;

      const vendorName =
        vendorInfo?.VendorName ||
        "Unknown Vendor";

      const vendorLines =
        vendorInfo?.Qlines || [];

      const vendorLine =
        vendorLines.find(
          (line: any) =>

            normalize(
              line?.ProductName
            ) ===
            normalize(
              master?.ProductName
            )

            &&

            normalize(
              line?.specValue
            ) ===
            normalize(
              master?.specValue
            )
        );

      if (!vendorLine) return;

      const vendorQty =
        Number(
          vendorLine?.Quantity || 0
        );

      const vendorPrice =
        Number(
          vendorLine?.UnitPrice || 0
        );

      const targetPrice =
        Number(
          master?.TargetPrice || 0
        );

      const quantity =
        Number(
          master?.Quantity || 0
        );

      const priceDifference =
        money(
          vendorPrice -
          targetPrice
        );

      const totalVendorCost =
        money(
          vendorPrice *
          quantity
        );

      const quantityMatch =
        vendorQty === quantity;

      const priceMatch =
        vendorPrice <= targetPrice;

      let recommendation =
        "Not Recommended";

      if (
        quantityMatch &&
        priceMatch
      ) {

        recommendation =
          "Recommended";

      } else if (
        quantityMatch
      ) {

        recommendation =
          "Above Target";

      } else {

        recommendation =
          "Insufficient Quantity";

      }

      matchingVendors.push({

        vendor:
          vendorName,

        quantity:
          vendorQty,

        vendorPrice:
          money(vendorPrice),

        priceDifference,

        totalVendorCost,

        quantityMatch,

        priceMatch,

        recommendation

      });

    });

    /*
     * No vendor quoted this exact Master product
     */

    if (
      matchingVendors.length === 0
    ) {

      missingProducts.push({

        productName:
          master?.ProductName || "",

        specValue:
          (master?.specValue || "")
            .replace(/Â/g, "")

      });

      products.push({

        productName:
          master?.ProductName || "",

        specification:
          (master?.specValue || "")
            .replace(/Â/g, ""),

        requestedQty:
          Number(
            master?.Quantity || 0
          ),

        targetPrice:
          money(
            Number(
              master?.TargetPrice || 0
            )
          ),

        vendors: [],

        cheapestVendor: "",

        cheapestPrice: 0,

        cheapestSavings: 0,

        recommendation:
          "Not Quoted",

        specStatus:
          "Missing Product"

      });

      return;
    }

    /*
     * Find cheapest vendor for this Master product
     */

    matchingVendors.sort(
      (a, b) =>
        a.vendorPrice -
        b.vendorPrice
    );

    const cheapest =
      matchingVendors[0];

    const targetPrice =
      Number(
        master?.TargetPrice || 0
      );

    const cheapestSavings =
      money(
        (
          targetPrice -
          cheapest.vendorPrice
        ) *
        Number(
          master?.Quantity || 0
        )
      );

    products.push({

      productName:
        master?.ProductName || "",

      specification:
        (master?.specValue || "")
          .replace(/Â/g, ""),

      requestedQty:
        Number(
          master?.Quantity || 0
        ),

      targetPrice:
        money(targetPrice),

      vendors:
        matchingVendors,

      cheapestVendor:
        cheapest.vendor,

      cheapestPrice:
        money(
          cheapest.vendorPrice
        ),

      cheapestSavings,

      recommendation:
        cheapest.recommendation,

      specStatus:
        "Specification Match"

    });

  });

  /*
   * ============================================================
   * EXTRA PRODUCTS
   * ============================================================
   */

  vendorQuotes.forEach(
    (vendorQuote: any) => {

      const vendorInfo =
        vendorQuote?.QuoteInfo?.[0];

      const vendorLines =
        vendorInfo?.Qlines || [];

      vendorLines.forEach(
        (vendorLine: any) => {

          const exists =
            masterLines.some(
              (master: any) =>

                normalize(
                  master?.ProductName
                ) ===
                normalize(
                  vendorLine?.ProductName
                )

                &&

                normalize(
                  master?.specValue
                ) ===
                normalize(
                  vendorLine?.specValue
                )
            );

          if (!exists) {

            extraProducts.push({

              productName:
                vendorLine?.ProductName ||
                "",

              specValue:
                (
                  vendorLine?.specValue ||
                  ""
                ).replace(/Â/g, ""),

              vendor:
                vendorInfo?.VendorName ||
                "Unknown Vendor"

            });

          }

        }
      );

    }
  );

  /*
   * ============================================================
   * QUANTITY / PRICE METRICS
   * ============================================================
   */

  const comparableProducts =
    products.filter(
      p =>
        p.vendors &&
        p.vendors.length > 0
    );

  const quantityMatchedCount =
    comparableProducts.filter(
      p =>
        p.vendors.some(
          (v: any) =>
            v.quantityMatch
        )
    ).length;

  const priceMatchedCount =
    comparableProducts.filter(
      p =>
        p.vendors.some(
          (v: any) =>
            v.priceMatch
        )
    ).length;

  const qtyMatchPercentage =
    comparableProducts.length > 0
      ? Math.round(
          (
            quantityMatchedCount /
            comparableProducts.length
          ) * 100
        )
      : 0;

  const overallPriceMatchPercentage =
    comparableProducts.length > 0
      ? Math.round(
          (
            priceMatchedCount /
            comparableProducts.length
          ) * 100
        )
      : 0;

  /*
   * ============================================================
   * BEST COMBINED COST
   * ============================================================
   */

  const bestCombinedVendorCost =
    products.reduce(
      (
        total: number,
        product: any
      ) => {

        return (
          total +
          Number(
            product?.cheapestPrice || 0
          ) *
          Number(
            product?.requestedQty || 0
          )
        );

      },
      0
    );

  /*
   * ============================================================
   * VENDOR COVERAGE
   * ============================================================
   */

  const vendorCoverage: Record<
    string,
    number
  > = {};

  vendorQuotes.forEach(
    (quote: any) => {

      const info =
        quote?.QuoteInfo?.[0];

      const vendor =
        info?.VendorName ||
        "Unknown Vendor";

      const lineCount =
        info?.Qlines?.length || 0;

      vendorCoverage[vendor] =
        lineCount;

    }
  );

  const coverageText =
    Object.entries(
      vendorCoverage
    )
      .map(
        ([vendor, count]) =>
          `${vendor}: ${count} products`
      )
      .join(", ");

  /*
   * ============================================================
   * FINAL REPORT
   * ============================================================
   */

  return {

    mode: "MASTER",

    /*
     * Selected quote information
     */

    inputQuoteId:
      selectedQuote?.QuoteInfo?.[0]?.QuoteId ||
      masterInfo?.QuoteId ||
      "",

    selectedQuoteNumber:
      selectedQuote?.QuoteInfo?.[0]?.QuoteNumber ||
      masterInfo?.QuoteNumber ||
      "",

    selectedQuoteName:
      selectedQuote?.QuoteInfo?.[0]?.QuoteName ||
      masterInfo?.QuoteName ||
      "",

    selectedQuoteType:
      selectedQuote?.QuoteInfo?.[0]?.QuoteType ||
      masterInfo?.QuoteType ||
      "",

    selectedVendor:
      selectedQuote?.QuoteInfo?.[0]?.VendorName ||
      "",

    /*
     * Parent Master information
     */

    parentQuoteId:
      masterInfo?.QuoteId ||
      "",

    parentQuoteNumber:
      masterInfo?.QuoteNumber ||
      "",

    parentQuoteName:
      masterInfo?.QuoteName ||
      "",

    /*
     * Master information
     */

    quoteId:
      masterInfo?.QuoteId ||
      "",

    quoteName:
      masterInfo?.QuoteName ||
      "",

    quoteNumber:
      masterInfo?.QuoteNumber ||
      "",

    quoteType:
      masterInfo?.QuoteType ||
      "Master",

    totalProducts:
      masterLines.length,

    /*
     * IMPORTANT:
     * This is the mixed best-price basket,
     * not one vendor's quotation total.
     */

    totalAmount:
      money(
        bestCombinedVendorCost
      ),

    bestCombinedVendorCost:
      money(
        bestCombinedVendorCost
      ),

    qtyMatchPercentage,

    overallPriceMatchPercentage,

    missingProductCount:
      missingProducts.length,

    extraProductCount:
      extraProducts.length,

    missingProducts,

    extraProducts,

    insights: [

      `${vendorQuotes.length} vendor quotes compared.`,

      `Vendor coverage: ${coverageText}`,

      `${missingProducts.length} Master products were not quoted by any vendor.`,

      `${extraProducts.length} extra products detected.`,

      `Best combined vendor cost: $${money(bestCombinedVendorCost).toFixed(2)}.`

    ],

    products

  };

}