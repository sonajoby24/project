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

  const vendorQuotes =
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
            numberValue(
              vendorLine?.Quantity
            );

          const vendorPrice =
            numberValue(
              vendorLine?.UnitPrice
            );

          /*
           * ------------------------------------------------------
           * QUANTITY MATCH
           * ------------------------------------------------------
           */

          const quantityMatch =
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
            vendorPrice <=
              targetPrice;

          /*
           * ------------------------------------------------------
           * PRICE DIFFERENCE
           * ------------------------------------------------------
           */

          const priceDifference =
            money(
              vendorPrice -
                targetPrice
            );

          /*
           * ------------------------------------------------------
           * TOTAL VENDOR COST
           * ------------------------------------------------------
           */

          const totalVendorCost =
            money(
              vendorPrice *
                requestedQty
            );

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
            !quantityMatch
          ) {
            recommendation =
              "Insufficient Quantity";
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

            vendorPrice:
              money(
                vendorPrice
              ),

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
        const productExistsInAnyVendor =
          vendorQuotes.some(
            (vendorQuote: any) => {
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

              return vendorLines.some(
                (line: any) =>
                  normalize(
                    line?.ProductName
                  ) ===
                  normalize(
                    master?.ProductName
                  )
              );
            }
          );

        if (
          !productExistsInAnyVendor
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
        }

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
            productExistsInAnyVendor
              ? "Specification Mismatch"
              : "Not Quoted",

          specStatus:
            productExistsInAnyVendor
              ? "Specification Mismatch"
              : "Missing Product"
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

      eligibleVendors.sort(
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
        eligibleVendors[0];

      /*
       * ==========================================================
       * PRICE TIE
       * ==========================================================
       */

      const priceTie =
        eligibleVendors.length > 1 &&
        eligibleVendors.every(
          (vendor: any) =>
            numberValue(
              vendor.vendorPrice
            ) ===
            numberValue(
              cheapest.vendorPrice
            )
        );

      /*
       * ==========================================================
       * SAVINGS
       * ==========================================================
       */

      const cheapestSavings =
        money(
          (
            targetPrice -
            numberValue(
              cheapest.vendorPrice
            )
          ) *
            requestedQty
        );

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
          "Not Recommended";
      } else if (
        !cheapest.quantityMatch
      ) {
        productRecommendation =
          "Insufficient Quantity";
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
          money(
            cheapest.vendorPrice
          ),

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
              vendor.quantityMatch ===
                true &&
              vendor.specificationMatch ===
                true
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
            numberValue(
              vendorLine?.Quantity
            );

          const masterQty =
            numberValue(
              master?.Quantity
            );

          const vendorPrice =
            numberValue(
              vendorLine?.UnitPrice
            );

          const targetPrice =
            numberValue(
              master?.TargetPrice
            );

          if (
            vendorQty ===
            masterQty
          ) {
            quantityMatched++;
          }

          if (
            vendorQty ===
              masterQty &&
            vendorPrice <=
              targetPrice
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