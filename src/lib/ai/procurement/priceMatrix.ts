import { analyzePrice } from "../priceAnalyzer";

export function buildPriceMatrix(quotes: any[]) {

  const matrix: any[] = [];

  quotes.forEach((quote) => {

    const info = quote?.QuoteInfo?.[0];

    console.log("QUOTE INFO:");
console.log(JSON.stringify(info, null, 2));

    if (!info) return;

    const vendor =
      info.VendorName ||
      "Master Quote";

    (info.Qlines || []).forEach((item: any) => {

      const analysis = analyzePrice(
        item.ProductName,
        Number(item.UnitPrice || 0),
        Number(item.TargetPrice || 0)
      );

      matrix.push({

        vendor,

        product: item.ProductName,

        quantity: Number(item.Quantity || 0),

        unitPrice: Number(item.UnitPrice || 0),

        targetPrice: Number(item.TargetPrice || 0),

        category: analysis.category,

        remark: analysis.remark,

        percentage: analysis.percentage

      });

    });

  });

  return matrix;

}