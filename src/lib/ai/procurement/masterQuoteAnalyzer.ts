import { analyzePrice } from "../priceAnalyzer";

function normalize(value: string = ""): string {
  return String(value)
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export interface MasterQuoteAnalysis {
  highPriceProducts: any[];
  missingProducts: any[];
  extraProducts: any[];
  quantityMismatch: any[];
  specificationMismatch: any[];
}

export function analyzeMasterQuote(
  quotes: any[]
): MasterQuoteAnalysis {

  const result: MasterQuoteAnalysis = {

    highPriceProducts: [],

    missingProducts: [],

    extraProducts: [],

    quantityMismatch: [],

    specificationMismatch: []

  };

  const masterQuote = quotes.find(
    (q: any) =>
      normalize(
        q?.QuoteInfo?.[0]?.QuoteType
      ) === "master"
  );

  if (!masterQuote) {
    return result;
  }

  const masterLines =
    masterQuote?.QuoteInfo?.[0]?.Qlines || [];

  const transactionalQuotes =
    quotes.filter(
      (q: any) =>
        normalize(
          q?.QuoteInfo?.[0]?.QuoteType
        ) !== "master"
    );

  transactionalQuotes.forEach(
    (quote: any) => {

      const info =
        quote?.QuoteInfo?.[0];

      if (!info) {
        return;
      }

      const vendor =
        info?.VendorName ||
        "Unknown Vendor";

      const vendorLines =
        info?.Qlines || [];

      masterLines.forEach(
        (master: any) => {

          /*
           * ============================================================
           * FIND EXACT PRODUCT + SPECIFICATION MATCH
           * ============================================================
           */

          const exactLine =
            vendorLines.find(
              (v: any) =>
                normalize(v?.ProductName) ===
                  normalize(master?.ProductName) &&
                normalize(v?.specValue) ===
                  normalize(master?.specValue)
            );

          /*
           * ============================================================
           * FIND SAME PRODUCT WITH DIFFERENT SPECIFICATION
           * ============================================================
           */

          const sameProductLine =
            vendorLines.find(
              (v: any) =>
                normalize(v?.ProductName) ===
                normalize(master?.ProductName)
            );

          /*
           * ============================================================
           * PRODUCT NOT QUOTED
           * ============================================================
           */

          if (!exactLine && !sameProductLine) {

            result.missingProducts.push({

              vendor,

              product:
                master?.ProductName || ""

            });

            return;
          }

          /*
           * ============================================================
           * SPECIFICATION MISMATCH
           * ============================================================
           */

          if (!exactLine && sameProductLine) {

            result.specificationMismatch.push({

              vendor,

              product:
                master?.ProductName || "",

              masterSpec:
                master?.specValue || "",

              vendorSpec:
                sameProductLine?.specValue || ""

            });

            /*
             * Continue analysing the quoted line for quantity
             * and price because the vendor did quote the product.
             */

            const line =
              sameProductLine;

            if (
              Number(line?.Quantity) !==
              Number(master?.Quantity)
            ) {

              result.quantityMismatch.push({

                vendor,

                product:
                  master?.ProductName || "",

                masterQty:
                  master?.Quantity,

                vendorQty:
                  line?.Quantity

              });

            }

            const analysis =
              analyzePrice(
                master?.ProductName || "",
                Number(line?.UnitPrice),
                Number(master?.TargetPrice)
              );

            if (analysis.percentage > 0) {

              result.highPriceProducts.push({

                vendor,

                product:
                  master?.ProductName || "",

                unitPrice:
                  line?.UnitPrice,

                targetPrice:
                  master?.TargetPrice,

                analysis

              });

            }

            return;
          }

          /*
           * ============================================================
           * EXACT MATCH FOUND
           * ============================================================
           */

          const line =
            exactLine;

          /*
           * ============================================================
           * QUANTITY MISMATCH
           * ============================================================
           */

          if (
            Number(line?.Quantity) !==
            Number(master?.Quantity)
          ) {

            result.quantityMismatch.push({

              vendor,

              product:
                master?.ProductName || "",

              masterQty:
                master?.Quantity,

              vendorQty:
                line?.Quantity

            });

          }

          /*
           * ============================================================
           * PRICE ANALYSIS
           * ============================================================
           */

          const analysis =
            analyzePrice(
              master?.ProductName || "",
              Number(line?.UnitPrice),
              Number(master?.TargetPrice)
            );

          if (analysis.percentage > 0) {

            result.highPriceProducts.push({

              vendor,

              product:
                master?.ProductName || "",

              unitPrice:
                line?.UnitPrice,

              targetPrice:
                master?.TargetPrice,

              analysis

            });

          }

        }
      );

      /*
       * ============================================================
       * EXTRA PRODUCTS
       * ============================================================
       */

      vendorLines.forEach(
        (line: any) => {

          const exists =
            masterLines.some(
              (master: any) =>
                normalize(
                  master?.ProductName
                ) ===
                  normalize(
                    line?.ProductName
                  ) &&
                normalize(
                  master?.specValue
                ) ===
                  normalize(
                    line?.specValue
                  )
            );

          if (!exists) {

            result.extraProducts.push({

              vendor,

              product:
                line?.ProductName || ""

            });

          }

        }
      );

    }
  );

  return result;
}