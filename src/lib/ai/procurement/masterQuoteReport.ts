function normalize(value: any = ""): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanSpec(value: any = ""): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function numberValue(value: any): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function money(value: any): number {
  return Number(
    numberValue(value).toFixed(2)
  );
}

function getQuoteInfo(
  quote: any
): any {
  return quote?.QuoteInfo?.[0] ?? {};
}

function getQuoteId(
  quote: any
): string {
  const info =
    getQuoteInfo(quote);

  return String(
    info?.QuoteId ||
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

function getProductKey(
  line: any
): string {
  return `${normalize(
    line?.ProductName
  )}|${normalize(
    line?.specValue
  )}`;
}

function getProductNameKey(
  line: any
): string {
  return normalize(
    line?.ProductName
  );
}

function getQuantity(line: any): number | null {
  const raw =
    line?.Quantity ??
    line?.quantity ??
    "";

  if (
    raw === "" ||
    raw === null ||
    raw === undefined
  ) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}


function getUnitPrice(line: any): number | null {
  const raw =
    line?.UnitPrice ??
    line?.unitPrice ??
    line?.QuotedPrice ??
    line?.quotedPrice ??
    line?.Price ??
    line?.price ??
    "";

  if (
    raw === "" ||
    raw === null ||
    raw === undefined
  ) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export function generateMasterQuoteReport(
  quotes: any[],
  selectedQuote?: any
): any {
  const allQuotes =
    Array.isArray(quotes)
      ? quotes
      : [];

  /*
   * ============================================================
   * FIND THE SELECTED MASTER QUOTE
   * ============================================================
   *
   * Do NOT select the first Master Quote.
   *
   * If selectedQuote is supplied, it is the authoritative quote.
   */

  let masterQuote: any = null;

  if (
    selectedQuote &&
    getQuoteType(
      selectedQuote
    ) === "master"
  ) {
    const selectedId =
      getQuoteId(
        selectedQuote
      );

    masterQuote =
      allQuotes.find(
        (quote: any) =>
          getQuoteType(
            quote
          ) === "master" &&
          getQuoteId(
            quote
          ) === selectedId
      ) || selectedQuote;
  }

  /*
   * Fallback only when the supplied dataset contains exactly one
   * Master Quote.
   *
   * This prevents silently choosing an arbitrary Master Quote
   * when multiple Masters exist.
   */

  if (
    !masterQuote
  ) {
    const masterQuotes =
      allQuotes.filter(
        (quote: any) =>
          getQuoteType(
            quote
          ) === "master"
      );

    if (
      masterQuotes.length === 1
    ) {
      masterQuote =
        masterQuotes[0];
    }
  }

  if (!masterQuote) {
    throw new Error(
      "Master Quote not found or selected Master Quote is ambiguous."
    );
  }

  const masterInfo =
    getQuoteInfo(
      masterQuote
    );

  const masterQuoteId =
    getQuoteId(
      masterQuote
    );

  const masterLines =
    Array.isArray(
      masterInfo?.Qlines
    )
      ? masterInfo.Qlines
      : [];

  /*
   * ============================================================
   * FIND ALL CHILD QUOTES
   * ============================================================
   *
   * ONLY quotes whose ParentQuoteID points to this Master Quote
   * are vendor/child quotations for this report.
   */

  const allVendorQuotes =
  Array.from(
    new Map(
      allQuotes
        .filter(
          (quote: any) =>
            getQuoteType(
              quote
            ) !== "master" &&
            getParentQuoteId(
              quote
            ) === masterQuoteId
        )
        .map(
          (
            quote: any,
            index: number
          ) => {
            const info =
              getQuoteInfo(
                quote
              );

            const uniqueKey =
              String(
                info?.QuoteId ||
                  quote?.id ||
                  `${info?.VendorName || "Unknown Vendor"}-${info?.QuoteNumber || index}`
              );

            return [
              uniqueKey,
              quote
            ];
          }
        )
    ).values()
  );

  /**
 * ============================================================
 * SELECT TOP 3 CHILD QUOTES
 * ============================================================
 *
 * Ranking rule:
 *
 * 1. Consider only products from the Master Quote.
 * 2. A child quote must actually quote the Master product.
 * 3. Quantity must exist before its unit price is used
 *    for price comparison.
 * 4. Quotes with comparable quantity + unit price
 *    rank before quotes without comparable pricing.
 * 5. Lower comparable unit-price total ranks higher.
 * 6. Lower average unit price is used as a tie-breaker.
 *
 * If quantity is missing, the line is reported as
 * "Quantity Missing" and its unit price is not used
 * for Top-3 ranking.
 */

const rankedVendorQuotes =
  allVendorQuotes.map(
    (
      vendorQuote: any
    ) => {

      const vendorInfo =
        getQuoteInfo(
          vendorQuote
        );

      const vendorLines =
        Array.isArray(
          vendorInfo?.Qlines
        )
          ? vendorInfo.Qlines
          : [];

      let quotedProductCount = 0;

      let comparableProductCount = 0;

      let comparableUnitPriceTotal = 0;

      let missingQuantityCount = 0;

      masterLines.forEach(
        (
          masterLine: any
        ) => {

          const masterProduct =
            normalize(
              masterLine?.ProductName
            );

          const masterSpec =
            normalize(
              masterLine?.specValue
            );

          /**
           * First try exact Product + Specification.
           */
          let vendorLine =
            vendorLines.find(
              (
                line: any
              ) =>
                normalize(
                  line?.ProductName
                ) === masterProduct &&
                normalize(
                  line?.specValue
                ) === masterSpec
            );

          /**
           * If exact specification is not available,
           * try the same product.
           */
          if (!vendorLine) {
            vendorLine =
              vendorLines.find(
                (
                  line: any
                ) =>
                  normalize(
                    line?.ProductName
                  ) === masterProduct
              );
          }

          /**
           * Vendor did not quote this Master product.
           */
          if (!vendorLine) {
            return;
          }

          quotedProductCount++;

          const unitPrice =
            getUnitPrice(
              vendorLine
            );

          const quantity =
            getQuantity(
              vendorLine
            );

          /**
           * Quantity missing:
           * mention it in the report later,
           * but do not use it as a quantity match.
           */
          if (
            quantity === null
          ) {
            missingQuantityCount++;
          }

         /**
 * Compare unit price ONLY when quantity exists.
 */
          if (
  quantity !== null &&
  unitPrice !== null
) {
  comparableProductCount++;

  comparableUnitPriceTotal +=
    unitPrice;
}
        }
      );

      const averageUnitPrice =
        comparableProductCount > 0
          ? comparableUnitPriceTotal /
            comparableProductCount
          : Number.POSITIVE_INFINITY;

      return {
        quote: vendorQuote,

        quotedProductCount,

        comparableProductCount,

        comparableUnitPriceTotal,

        averageUnitPrice,

        missingQuantityCount
      };
    }
  );

/**
 * Rank child quotes.
 *
 * Ranking is based on comparable unit price.
 *
 * 1. Quotes with an actual comparable quantity + unit price
 *    rank before quotes without comparable pricing.
 * 2. Lower comparable unit-price total ranks higher.
 * 3. Lower average unit price is used as a tie-breaker.
 *
 * Quantity-missing lines are not used for price comparison.
 * They are reported separately as "Quantity Missing".
 */
rankedVendorQuotes.sort(
  (
    a: any,
    b: any
  ) => {

    const aHasComparablePrice =
      a.comparableProductCount > 0;

    const bHasComparablePrice =
      b.comparableProductCount > 0;

    /*
     * Quotes with an actual comparable price
     * must come before quotes where price
     * cannot be compared.
     */
    if (
      aHasComparablePrice !==
      bHasComparablePrice
    ) {
      return aHasComparablePrice
        ? -1
        : 1;
    }

    /*
     * Lower comparable unit-price total
     * ranks higher.
     */
    if (
      a.comparableUnitPriceTotal !==
      b.comparableUnitPriceTotal
    ) {
      return (
        a.comparableUnitPriceTotal -
        b.comparableUnitPriceTotal
      );
    }

    /*
     * Tie-breaker:
     * lower average unit price.
     */
    return (
      a.averageUnitPrice -
      b.averageUnitPrice
    );
  }
);

/**
 * Only the Top 3 child quotes are used
 * for the Master Quote comparison.
 */
const vendorQuotes =
  rankedVendorQuotes
    .slice(0, 3)
    .map(
      (
        item: any
      ) => item.quote
    );

console.log(
  "ALL CHILD QUOTES:",
  allVendorQuotes.length
);

console.log(
  "TOP 3 CHILD QUOTES:",
  vendorQuotes.length
);

console.log(
  "TOP 3 CHILD QUOTE RANKING:",
  rankedVendorQuotes
    .slice(0, 3)
    .map(
      (
        item: any,
        index: number
      ) => {

        const info =
          getQuoteInfo(
            item.quote
          );

        return {
          rank:
            index + 1,

          vendor:
            info?.VendorName ||
            "Unknown Vendor",

          quoteId:
            getQuoteId(
              item.quote
            ),

          quoteNumber:
            info?.QuoteNumber ||
            "",

          quotedProductCount:
            item.quotedProductCount,

          comparableProductCount:
            item.comparableProductCount,

          comparableUnitPriceTotal:
            money(
              item.comparableUnitPriceTotal
            ),

          averageUnitPrice:
            money(
              item.averageUnitPrice
            ),

          missingQuantityCount:
            item.missingQuantityCount
        };
      }
    )
);

  console.log(
    "===================================="
  );

  console.log(
    "MASTER QUOTE REPORT"
  );

  console.log(
    "MASTER QUOTE ID:",
    masterQuoteId
  );

  console.log(
    "MASTER QUOTE NUMBER:",
    masterInfo?.QuoteNumber
  );

  console.log(
    "CHILD QUOTES:",
    vendorQuotes.length
  );

  console.log(
    "===================================="
  );

  /*
   * ============================================================
   * NO CHILD QUOTES
   * ============================================================
   */

  if (
    vendorQuotes.length === 0
  ) {
    const missingProducts =
      masterLines.map(
        (line: any) => ({
          productName:
            line?.ProductName ?? "",

          specValue:
            cleanSpec(
              line?.specValue
            )
        })
      );

    return {
      mode: "MASTER",

      inputQuoteId:
        getQuoteId(
          selectedQuote
        ) ||
        masterInfo?.QuoteId ||
        "",

      selectedQuoteNumber:
        getQuoteInfo(
          selectedQuote
        )?.QuoteNumber ||
        masterInfo?.QuoteNumber ||
        "",

      selectedQuoteName:
        getQuoteInfo(
          selectedQuote
        )?.QuoteName ||
        masterInfo?.QuoteName ||
        "",

      selectedQuoteType:
        getQuoteInfo(
          selectedQuote
        )?.QuoteType ||
        masterInfo?.QuoteType ||
        "",

      selectedVendor:
        getQuoteInfo(
          selectedQuote
        )?.VendorName ||
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

      bestCombinedVendorCost: 0,

      qtyMatchPercentage: 0,

      overallPriceMatchPercentage: 0,

      missingProductCount:
        missingProducts.length,

      extraProductCount: 0,

      missingProducts,

      extraProducts: [],

      vendorCount: 0,

      vendorQuotes: [],

      vendorSummary: [],

      vendorsCompared: [],

      insights: [
        "No child/vendor quotations are associated with this Master Quote."
      ],

      products: []
    };
  }

  const products: any[] = [];
  const missingProducts: any[] = [];
  const extraProducts: any[] = [];

  /*
   * ============================================================
   * TRACK USED VENDOR LINES
   * ============================================================
   *
   * This prevents the same vendor Qline from being incorrectly
   * used for multiple duplicate Master Qlines.
   */

  const usedVendorIndexes =
    new Map<string, Set<number>>();

  vendorQuotes.forEach(
    (vendorQuote: any) => {
      const quoteId =
        getQuoteId(
          vendorQuote
        );

      usedVendorIndexes.set(
        quoteId,
        new Set<number>()
      );
    }
  );

  /*
   * ============================================================
   * MASTER PRODUCT → ALL CHILD/VENDOR QUOTES
   * ============================================================
   */

  masterLines.forEach(
    (master: any) => {
      const matchingVendors: any[] = [];

      const requestedQty =
        numberValue(
          master?.Quantity
        );

      const targetPrice =
        numberValue(
          master?.TargetPrice
        );

      vendorQuotes.forEach(
        (vendorQuote: any) => {
          const vendorInfo =
            getQuoteInfo(
              vendorQuote
            );

          if (!vendorInfo) {
            return;
          }

          const vendor =
            vendorInfo?.VendorName ||
            "Unknown Vendor";

          const quoteId =
            getQuoteId(
              vendorQuote
            );

          const quoteNumber =
            vendorInfo?.QuoteNumber ||
            "";

          const vendorLines =
            Array.isArray(
              vendorInfo?.Qlines
            )
              ? vendorInfo.Qlines
              : [];

          const usedIndexes =
            usedVendorIndexes.get(
              quoteId
            ) ||
            new Set<number>();

          /*
           * ------------------------------------------------------
           * EXACT PRODUCT + SPECIFICATION
           * ------------------------------------------------------
           */

          let vendorIndex =
            vendorLines.findIndex(
              (
                line: any,
                index: number
              ) =>
                !usedIndexes.has(
                  index
                ) &&
                normalize(
                  line?.ProductName
                ) ===
                  normalize(
                    master?.ProductName
                  ) &&
                normalize(
                  line?.specValue
                ) ===
                  normalize(
                    master?.specValue
                  )
            );

          let specificationMatch =
            true;

          /*
           * ------------------------------------------------------
           * SAME PRODUCT / DIFFERENT SPECIFICATION
           * ------------------------------------------------------
           */

          if (
            vendorIndex === -1
          ) {
            vendorIndex =
              vendorLines.findIndex(
                (
                  line: any,
                  index: number
                ) =>
                  !usedIndexes.has(
                    index
                  ) &&
                  normalize(
                    line?.ProductName
                  ) ===
                    normalize(
                      master?.ProductName
                    )
              );

            if (
              vendorIndex !== -1
            ) {
              specificationMatch =
                false;
            }
          }

          /*
           * ------------------------------------------------------
           * VENDOR DID NOT QUOTE PRODUCT
           * ------------------------------------------------------
           */

          if (
            vendorIndex === -1
          ) {
            return;
          }

          usedIndexes.add(
            vendorIndex
          );

          usedVendorIndexes.set(
            quoteId,
            usedIndexes
          );

          const vendorLine =
            vendorLines[
              vendorIndex
            ];

          const vendorQty =
  getQuantity(
    vendorLine
  );

const vendorPrice =
  getUnitPrice(
    vendorLine
  );

          /*
           * ------------------------------------------------------
           * QUANTITY MATCH
           * ------------------------------------------------------
           */

         const quantityMatch =
  vendorQty !== null &&
  vendorQty ===
    requestedQty;

          /*
           * ------------------------------------------------------
           * PRICE MATCH
           * ------------------------------------------------------
           *
           * Price compliance is factual:
           *
           * specification matches
           * AND quantity matches
           * AND vendor price is not above target
           */

         const priceMatch =
  specificationMatch &&
  quantityMatch &&
  vendorPrice !== null &&
  vendorPrice <=
    targetPrice;

          /*
           * ------------------------------------------------------
           * PRICE DIFFERENCE
           * ------------------------------------------------------
           */

         const priceDifference =
  vendorPrice !== null
    ? money(
        vendorPrice -
          targetPrice
      )
    : null;

          /*
           * ------------------------------------------------------
           * TOTAL VENDOR COST
           * ------------------------------------------------------
           */

         const totalVendorCost =
  vendorPrice !== null
    ? money(
        vendorPrice *
          requestedQty
      )
    : 0;

          /*
           * ------------------------------------------------------
           * RECOMMENDATION
           * ------------------------------------------------------
           */

        let recommendation =
  "Not Recommended";

if (
  !specificationMatch
) {
  recommendation =
    "Specification Mismatch";
} else if (
  vendorQty === null
) {
  recommendation =
    "Quantity Missing";
} else if (
  !quantityMatch
) {
  recommendation =
    "Insufficient Quantity";
} else if (
  vendorPrice === null
) {
  recommendation =
    "Price Missing";
} else if (
  !priceMatch
) {
  recommendation =
    "Above Target";
} else {
  recommendation =
    "Recommended";
}


          matchingVendors.push({
            vendor,

            quoteId,

            quoteNumber,

            quoteName:
              vendorInfo?.QuoteName ??
              "",

            quoteType:
              vendorInfo?.QuoteType ??
              "Transactional",

           quantity:
  vendorQty,

quantityStatus:
  vendorQty === null
    ? "Quantity Missing"
    : quantityMatch
      ? "Quantity Match"
      : "Quantity Mismatch",

vendorPrice:
  vendorPrice !== null
    ? money(
        vendorPrice
      )
    : null,

            priceDifference,

            totalVendorCost,

            quantityMatch,

            priceMatch,

            specificationMatch,

            masterSpecification:
              cleanSpec(
                master?.specValue
              ),

            vendorSpecification:
              cleanSpec(
                vendorLine?.specValue
              ),

            recommendation
          });
        }
      );

      /*
       * ==========================================================
       * MISSING PRODUCT
       * ==========================================================
       *
       * A product is missing only when no child quote contains
       * that ProductName.
       */

      if (
        matchingVendors.length === 0
      ) {
       missingProducts.push({
  productName:
    master?.ProductName ??
    "",

  specValue:
    cleanSpec(
      master?.specValue
    )
});

        products.push({
          productName:
            master?.ProductName ??
            "",

          specification:
            cleanSpec(
              master?.specValue
            ),

          requestedQty,

          targetPrice:
            money(
              targetPrice
            ),

          vendors: [],

          cheapestVendor: "",

          cheapestVendorQuoteId:
            "",

          cheapestVendorQuoteNumber:
            "",

          cheapestPrice: null,

          cheapestSavings: 0,

          priceTie: false,

        recommendation:
  "Not Quoted",

specStatus:
  "Not Quoted"
        });

        return;
      }

      /*
       * ==========================================================
       * SELECT ELIGIBLE VENDORS
       * ==========================================================
       */

      const specificationMatched =
        matchingVendors.filter(
          (vendor: any) =>
            vendor.specificationMatch ===
            true
        );

      const fullyMatching =
        specificationMatched.filter(
          (vendor: any) =>
            vendor.quantityMatch ===
            true
        );

      /*
       * Priority:
       *
       * 1. Exact specification + quantity
       * 2. Exact specification
       * 3. Same product / different specification
       */

      const eligibleVendors =
        fullyMatching.length > 0
          ? [...fullyMatching]
          : specificationMatched.length > 0
            ? [...specificationMatched]
            : [...matchingVendors];

      /*
       * Cheapest eligible vendor is used for the factual
       * cheapest-price field.
       */

    const priceComparableVendors =
  eligibleVendors.filter(
    (vendor: any) =>
      vendor.vendorPrice !== null
  );

const priceCandidates =
  priceComparableVendors.length > 0
    ? priceComparableVendors
    : eligibleVendors;

priceCandidates.sort(
  (
    a: any,
    b: any
  ) =>
    numberValue(
      a.vendorPrice
    ) -
    numberValue(
      b.vendorPrice
    )
);

const cheapest =
  priceCandidates[0];

      /*
       * ==========================================================
       * PRICE TIE
       * ==========================================================
       */

     const priceTie =
  priceCandidates.length > 1 &&
  cheapest.vendorPrice !== null &&
  priceCandidates.every(
    (vendor: any) =>
      vendor.vendorPrice !== null &&
      vendor.vendorPrice ===
        cheapest.vendorPrice
  );

      /*
       * ==========================================================
       * SAVINGS
       * ==========================================================
       */

      const cheapestSavings =
  cheapest.vendorPrice !== null
    ? money(
        (
          targetPrice -
          cheapest.vendorPrice
        ) *
          requestedQty
      )
    : 0;

      /*
       * ==========================================================
       * PRODUCT RECOMMENDATION
       * ==========================================================
       */
let productRecommendation =
  "Not Recommended";

if (
  !cheapest.specificationMatch
) {
  productRecommendation =
    "Specification Mismatch";
} else if (
  cheapest.quantity === null
) {
  productRecommendation =
    "Quantity Missing";
} else if (
  !cheapest.quantityMatch
) {
  productRecommendation =
    "Insufficient Quantity";
} else if (
  cheapest.vendorPrice === null
) {
  productRecommendation =
    "Price Missing";
} else if (
  !cheapest.priceMatch
) {
  productRecommendation =
    "Above Target";
} else {
  productRecommendation =
    "Recommended";
}

      /*
       * ==========================================================
       * PRODUCT RESULT
       * ==========================================================
       */

      products.push({
        productName:
          master?.ProductName ??
          "",

        specification:
          cleanSpec(
            master?.specValue
          ),

        requestedQty,

        targetPrice:
          money(
            targetPrice
          ),

        vendors:
          matchingVendors,

        cheapestVendor:
          cheapest.vendor,

        cheapestVendorQuoteId:
          cheapest.quoteId,

        cheapestVendorQuoteNumber:
          cheapest.quoteNumber,

       cheapestPrice:
  cheapest.vendorPrice !== null
    ? money(
        cheapest.vendorPrice
      )
    : null,

        cheapestSavings,

        priceTie,

        recommendation:
          productRecommendation,

        specStatus:
          cheapest.specificationMatch
            ? "Specification Match"
            : "Specification Mismatch"
      });
    }
  );

  /*
   * ============================================================
   * EXTRA PRODUCTS
   * ============================================================
   *
   * A vendor product is extra only if its ProductName does not
   * exist in the Master Quote.
   *
   * Same ProductName + different specification is not extra.
   */

  const masterProductNames =
    new Set(
      masterLines.map(
        getProductNameKey
      )
    );

  const extraProductKeys =
    new Set<string>();

  vendorQuotes.forEach(
    (
      vendorQuote: any
    ) => {
      const vendorInfo =
        getQuoteInfo(
          vendorQuote
        );

      const vendorLines =
        Array.isArray(
          vendorInfo?.Qlines
        )
          ? vendorInfo.Qlines
          : [];

      vendorLines.forEach(
        (
          vendorLine: any
        ) => {
          const productNameKey =
            getProductNameKey(
              vendorLine
            );

          if (
            !masterProductNames.has(
              productNameKey
            )
          ) {
            const key =
              getProductKey(
                vendorLine
              );

            if (
              !extraProductKeys.has(
                key
              )
            ) {
              extraProductKeys.add(
                key
              );

              extraProducts.push({
                productName:
                  vendorLine?.ProductName ??
                  "",

                specValue:
                  cleanSpec(
                    vendorLine?.specValue
                  ),

                vendor:
                  vendorInfo?.VendorName ||
                  "Unknown Vendor",

                quoteId:
                  vendorInfo?.QuoteId ||
                  getQuoteId(
                    vendorQuote
                  ),

                quoteNumber:
                  vendorInfo?.QuoteNumber ||
                  ""
              });
            }
          }
        }
      );
    }
  );

  /*
   * ============================================================
   * METRICS
   * ============================================================
   */

  const totalProducts =
    masterLines.length;

  /*
   * At least one child quote must satisfy:
   *
   * exact specification
   * AND exact quantity
   */

  const quantityMatchedCount =
    products.filter(
      (product: any) =>
        Array.isArray(
          product.vendors
        ) &&
        product.vendors.some(
          (vendor: any) =>
            vendor.quantityMatch ===
              true &&
            vendor.specificationMatch ===
              true
        )
    ).length;

  /*
   * At least one child quote must satisfy:
   *
   * exact specification
   * AND exact quantity
   * AND target price
   */

  const priceMatchedCount =
    products.filter(
      (product: any) =>
        Array.isArray(
          product.vendors
        ) &&
        product.vendors.some(
          (vendor: any) =>
            vendor.priceMatch ===
              true &&
            vendor.quantityMatch ===
              true &&
            vendor.specificationMatch ===
              true
        )
    ).length;

  /*
   * ============================================================
   * QUANTITY %
   * ============================================================
   */

  const qtyMatchPercentage =
    totalProducts > 0
      ? Math.round(
          (
            quantityMatchedCount /
            totalProducts
          ) *
            100
        )
      : 0;

  /*
   * ============================================================
   * PRICE %
   * ============================================================
   */

  const overallPriceMatchPercentage =
    quantityMatchedCount > 0
      ? Math.round(
          (
            priceMatchedCount /
            quantityMatchedCount
          ) *
            100
        )
      : 0;

  /*
   * ============================================================
   * BEST COMBINED COST
   * ============================================================
   *
   * For every Master product, choose the cheapest child quote
   * that has exact specification + exact quantity.
   *
   * Only actual Firestore prices are used.
   */

  const bestCombinedVendorCost =
    products.reduce(
      (
        total: number,
        product: any
      ) => {
        if (
          !Array.isArray(
            product.vendors
          ) ||
          product.vendors.length === 0
        ) {
          return total;
        }

       const fullyMatching =
  product.vendors.filter(
    (vendor: any) =>
      vendor.quantityMatch === true &&
      vendor.specificationMatch === true &&
      vendor.vendorPrice !== null
  );
        if (
          fullyMatching.length === 0
        ) {
          return total;
        }

        const cheapest =
          fullyMatching.reduce(
            (
              best: any,
              current: any
            ) =>
              numberValue(
                current.vendorPrice
              ) <
              numberValue(
                best.vendorPrice
              )
                ? current
                : best
          );

        return (
          total +
          numberValue(
            cheapest.vendorPrice
          ) *
            numberValue(
              product.requestedQty
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
    {
      quoteId: string;
      quoteNumber: string;
      quoted: number;
      exact: number;
      quantityMatched: number;
      priceMatched: number;
    }
  > = {};

  vendorQuotes.forEach(
    (
      vendorQuote: any
    ) => {
      const info =
        getQuoteInfo(
          vendorQuote
        );

      if (!info) {
        return;
      }

      const vendor =
        info?.VendorName ||
        "Unknown Vendor";

      const quoteId =
        getQuoteId(
          vendorQuote
        );

      const quoteNumber =
        info?.QuoteNumber ||
        "";

      const vendorLines =
        Array.isArray(
          info?.Qlines
        )
          ? info.Qlines
          : [];

      let quoted = 0;
      let exact = 0;
      let quantityMatched = 0;
      let priceMatched = 0;

      /*
       * Prevent one vendor line from being counted for multiple
       * duplicate Master Qlines.
       */

      const usedIndexes =
        new Set<number>();

      masterLines.forEach(
        (
          master: any
        ) => {
          let vendorIndex =
            vendorLines.findIndex(
              (
                line: any,
                index: number
              ) =>
                !usedIndexes.has(
                  index
                ) &&
                normalize(
                  line?.ProductName
                ) ===
                  normalize(
                    master?.ProductName
                  )
            );

          if (
            vendorIndex === -1
          ) {
            return;
          }

          usedIndexes.add(
            vendorIndex
          );

          quoted++;

          const vendorLine =
            vendorLines[
              vendorIndex
            ];

          const exactMatch =
            normalize(
              vendorLine?.specValue
            ) ===
            normalize(
              master?.specValue
            );

          if (!exactMatch) {
            return;
          }

          exact++;

         const vendorQty =
  getQuantity(
    vendorLine
  );

const masterQty =
  getQuantity(
    master
  );

const vendorPrice =
  getUnitPrice(
    vendorLine
  );

          const targetPrice =
            numberValue(
              master?.TargetPrice
            );

         if (
  vendorQty !== null &&
  masterQty !== null &&
  vendorQty === masterQty
) {
  quantityMatched++;
}

if (
  vendorQty !== null &&
  masterQty !== null &&
  vendorQty === masterQty &&
  vendorPrice !== null &&
  vendorPrice <= targetPrice
) {
  priceMatched++;
}
        }
      );

      const coverageKey =
        quoteId ||
        `${vendor}-${quoteNumber}`;

      vendorCoverage[
        coverageKey
      ] = {
        quoteId,

        quoteNumber,

        quoted,

        exact,

        quantityMatched,

        priceMatched
      };
    }
  );

  /*
   * ============================================================
   * VENDOR SUMMARY
   * ============================================================
   */

  const vendorSummary =
    Object.values(
      vendorCoverage
    ).map(
      (
        item: any
      ) => ({
        ...item
      })
    );

  /*
   * ============================================================
   * COVERAGE TEXT
   * ============================================================
   */

  const coverageText =
    vendorSummary
      .map(
        (item: any) => {
          const matchingQuote =
            vendorQuotes.find(
              (
                quote: any
              ) =>
                getQuoteId(
                  quote
                ) ===
                String(
                  item.quoteId
                )
            );

          const vendor =
            getQuoteInfo(
              matchingQuote
            )?.VendorName ||
            "Unknown Vendor";

          return `${vendor} (${item.quoteNumber || item.quoteId}): ${item.exact}/${totalProducts} exact products`;
        }
      )
      .join(", ");

  /*
   * ============================================================
   * FINAL REPORT
   * ============================================================
   */

  return {
    mode: "MASTER",

    inputQuoteId:
      getQuoteId(
        selectedQuote
      ) ||
      masterInfo?.QuoteId ||
      "",

    selectedQuoteNumber:
      getQuoteInfo(
        selectedQuote
      )?.QuoteNumber ||
      masterInfo?.QuoteNumber ||
      "",

    selectedQuoteName:
      getQuoteInfo(
        selectedQuote
      )?.QuoteName ||
      masterInfo?.QuoteName ||
      "",

    selectedQuoteType:
      getQuoteInfo(
        selectedQuote
      )?.QuoteType ||
      masterInfo?.QuoteType ||
      "",

    selectedVendor:
      getQuoteInfo(
        selectedQuote
      )?.VendorName ||
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

    /*
     * ==========================================================
     * MASTER METRICS
     * ==========================================================
     */

    totalProducts,

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

    /*
     * Number of actual child/vendor quotations compared.
     */

    vendorCount:
      vendorQuotes.length,

    /*
     * Detailed vendor-level summary.
     */

    vendorSummary,

    /*
     * Existing UI compatibility.
     */

    vendorQuotes:
      vendorQuotes.map(
        (
          quote: any
        ) => {
          const info =
            getQuoteInfo(
              quote
            );

          return {
            vendor:
              info?.VendorName ||
              "Unknown Vendor",

            quoteId:
              getQuoteId(
                quote
              ),

            quoteNumber:
              info?.QuoteNumber ||
              "",

            quoteName:
              info?.QuoteName ||
              "",

            quoteType:
              info?.QuoteType ||
              "Transactional"
          };
        }
      ),

    /*
     * Useful for UI/dashboard.
     */

    vendorsCompared:
      vendorQuotes.map(
        (
          quote: any
        ) => {
          const info =
            getQuoteInfo(
              quote
            );

          return {
            vendor:
              info?.VendorName ||
              "Unknown Vendor",

            quoteId:
              getQuoteId(
                quote
              ),

            quoteNumber:
              info?.QuoteNumber ||
              "",

            quoteName:
              info?.QuoteName ||
              "",

            quoteType:
              info?.QuoteType ||
              "Transactional"
          };
        }
      ),

    insights: [
      `${vendorQuotes.length} vendor quotes compared.`,

      `Vendor coverage: ${
        coverageText ||
        "No vendor coverage available."
      }`,

      `${missingProducts.length} Master products were not quoted by any vendor.`,

      `${extraProducts.length} extra products detected.`,

      `${quantityMatchedCount} of ${totalProducts} Master products have at least one vendor matching the requested quantity and specification.`,

      `${priceMatchedCount} of ${quantityMatchedCount} quantity- and specification-matched Master products have at least one vendor meeting the target price.`,

      `Quantity compliance: ${qtyMatchPercentage}%`,

      `Pricing compliance: ${overallPriceMatchPercentage}%`,

      `Best combined vendor cost: $${money(
        bestCombinedVendorCost
      ).toFixed(2)}.`
    ],

    products
  };
}