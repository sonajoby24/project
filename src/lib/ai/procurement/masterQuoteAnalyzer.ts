import { analyzePrice } from "../priceAnalyzer";

export interface MasterQuoteAnalysis {

  highPriceProducts: any[];

  missingProducts: any[];

  extraProducts: any[];

  quantityMismatch: any[];

  specificationMismatch: any[];

}

export function analyzeMasterQuote(quotes: any[]): MasterQuoteAnalysis {

  const result: MasterQuoteAnalysis = {

    highPriceProducts: [],

    missingProducts: [],

    extraProducts: [],

    quantityMismatch: [],

    specificationMismatch: []

  };

  const masterQuote = quotes.find(

    q => q?.QuoteInfo?.[0]?.QuoteType === "Master"

  );

  if (!masterQuote) {

    return result;

  }

  const masterLines =

    masterQuote.QuoteInfo[0].Qlines || [];

  const transactionalQuotes =

    quotes.filter(

      q => q?.QuoteInfo?.[0]?.QuoteType !== "Master"

    );

  transactionalQuotes.forEach((quote) => {

    const info = quote.QuoteInfo?.[0];

    if (!info) return;

    const vendor =

      info.VendorName || "Unknown Vendor";

    const vendorLines =

      info.Qlines || [];

    masterLines.forEach((master: any) => {

     const line = vendorLines.find(
  (v: any) =>
    v.ProductName === master.ProductName &&
    (v.specValue || "").trim() ===
      (master.specValue || "").trim()
);

      if (!line) {

        result.missingProducts.push({

          vendor,

          product: master.ProductName

        });

        return;

      }

      if (

        Number(line.Quantity) !==

        Number(master.Quantity)

      ) {

        result.quantityMismatch.push({

          vendor,

          product: master.ProductName,

          masterQty: master.Quantity,

          vendorQty: line.Quantity

        });

      }

      if (

        (line.specValue || "").trim()

        !==

        (master.specValue || "").trim()

      ) {

        result.specificationMismatch.push({

          vendor,

          product: master.ProductName,

          masterSpec: master.specValue,

          vendorSpec: line.specValue

        });

      }

      const analysis = analyzePrice(

        master.ProductName,

        Number(line.UnitPrice),

        Number(master.TargetPrice)

      );

      if (analysis.percentage > 0) {

        result.highPriceProducts.push({

          vendor,

          product: master.ProductName,

          unitPrice: line.UnitPrice,

          targetPrice: master.TargetPrice,

          analysis

        });

      }

    });

    vendorLines.forEach((line: any) => {

      const exists = masterLines.find(

        (m: any) =>

          m.ProductName === line.ProductName

      );

      if (!exists) {

        result.extraProducts.push({

          vendor,

          product: line.ProductName

        });

      }

    });

  });

  return result;

}