import { analyzePrice } from "../priceAnalyzer";

export function compareQuotes(quotes: any[]) {

  const comparison: any[] = [];

  // Find the Master Quote
  const masterQuote = quotes.find(
    q => q?.QuoteInfo?.[0]?.QuoteType === "Master"
  );

  const masterLines =
    masterQuote?.QuoteInfo?.[0]?.Qlines || [];

  quotes.forEach((quote) => {

    const info = quote?.QuoteInfo?.[0];
    if (!info) return;

    const vendor =
      info.VendorName || "Master Quote";

    (info.Qlines || []).forEach((line: any) => {

      // Find matching product in Master Quote
      const masterLine = masterLines.find(
        (m: any) =>
          m.ProductName === line.ProductName &&
          (m.specValue || "").trim() ===
          (line.specValue || "").trim()
      );

      const targetPrice = Number(
        masterLine?.TargetPrice || line.TargetPrice || 0
      );

      const analysis = analyzePrice(
        line.ProductName,
        Number(line.UnitPrice || 0),
        targetPrice
      );

      comparison.push({
        vendor,
        product: line.ProductName,
        quantity: Number(line.Quantity || 0),
        unitPrice: Number(line.UnitPrice || 0),
        targetPrice,
        analysis
      });

    });

  });

  return comparison;
}