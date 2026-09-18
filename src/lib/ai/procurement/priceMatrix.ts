import { analyzePrice } from "../priceAnalyzer";

function normalize(value: string = ""): string {
  return String(value)
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function buildPriceMatrix(
  masterQuote: any,
  vendorQuotes: any[]
) {

  const matrix: any[] = [];

  const masterInfo =
    masterQuote?.QuoteInfo?.[0];

  const masterLines =
    masterInfo?.Qlines || [];


  vendorQuotes.forEach(
    (quote: any) => {

      const vendorInfo =
        quote?.QuoteInfo?.[0];

      if (!vendorInfo) {
        return;
      }

      const vendorName =
        vendorInfo?.VendorName ||
        "Unknown Vendor";

      const vendorLines =
        vendorInfo?.Qlines || [];


      vendorLines.forEach(
        (vendorLine: any) => {

          /*
           * Find corresponding Master product.
           */

          const masterLine =
            masterLines.find(
              (master: any) =>
                normalize(
                  master?.ProductName
                ) ===
                normalize(
                  vendorLine?.ProductName
                ) &&

                normalize(
                  master?.specValue
                ) ===
                normalize(
                  vendorLine?.specValue
                )
            );


          /*
           * If vendor product is not in Master,
           * it is not part of Master price matrix.
           */

          if (!masterLine) {
            return;
          }


          const targetPrice =
            Number(
              masterLine?.TargetPrice || 0
            );

          const vendorPrice =
            Number(
              vendorLine?.UnitPrice || 0
            );


          const analysis =
            analyzePrice(
              vendorLine?.ProductName || "",
              vendorPrice,
              targetPrice
            );


          matrix.push({

            vendor:
              vendorName,

            product:
              vendorLine?.ProductName || "",

            specification:
              vendorLine?.specValue || "",

            quantity:
              Number(
                vendorLine?.Quantity || 0
              ),

            targetPrice,

            unitPrice:
              vendorPrice,

            percentage:
              analysis.percentage,

            category:
              analysis.category,

            remark:
              analysis.remark

          });

        }
      );

    }
  );


  return matrix;
}