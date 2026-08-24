export function findCheapestVendor(
  quotes: any[]
) {

  const vendors: Record<
    string,
    {
      total: number;
      count: number;
    }
  > = {};

  quotes.forEach((quote: any) => {

    const info = quote.QuoteInfo?.[0];

    if (!info) return;

    const vendor =
      info.VendorName || "Unknown";

    (info.Qlines || []).forEach((line: any) => {

      const price =
        Number(line.UnitPrice || 0);

      if (!price) return;

      if (!vendors[vendor]) {

        vendors[vendor] = {
          total: 0,
          count: 0,
        };

      }

      vendors[vendor].total += price;
      vendors[vendor].count++;

    });

  });

  let bestVendor = "";
  let average = Number.MAX_VALUE;

  Object.entries(vendors).forEach(
    ([vendor, data]) => {

      const avg =
        data.total / data.count;

      if (avg < average) {

        average = avg;
        bestVendor = vendor;

      }

    }
  );

  return {

    vendor: bestVendor,

    averagePrice:
      Number(average.toFixed(2))

  };

}