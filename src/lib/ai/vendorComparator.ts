import { analyzePrice } from "./priceAnalyzer";

export function compareVendorQuotes(quotes: any[]) {

  const comparison: any[] = [];

  quotes.forEach((quote: any) => {

    const info = quote.QuoteInfo?.[0];

    if (!info) return;

    const vendor = info.VendorName || "Master";

    (info.Qlines || []).forEach((line: any) => {

      comparison.push({

        vendor,

        product: line.ProductName,

        quantity: line.Quantity,

        unitPrice: Number(line.UnitPrice || 0),

        targetPrice: Number(line.TargetPrice || 0),

        analysis: analyzePrice(

          line.ProductName,

          Number(line.UnitPrice || 0),

          Number(line.TargetPrice || 0)

        )

      });

    });

  });

  return comparison;
}