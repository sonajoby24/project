import { normalizeField } from "./normalizer";

export function formatResponse(
  data: any,
  nlu: any
): string {

  const fields =
    (nlu?.fields || []).map((f: string) =>
      f.toLowerCase().replace(/\s+/g, "")
    );

  const showAll =
    fields.length === 0 ||
    fields.includes("*");

  let answer = "";

  function printRecord(record: any) {

    Object.entries(record).forEach(([key, value]) => {

      if (key === "raw") return;

      const normalizedKey =
        normalizeField(key);

      const normalizedField =
        normalizedKey
          .toLowerCase()
          .replace(/\s+/g, "");

      if (
        showAll ||
        fields.includes(normalizedField)
      ) {

        answer +=
          `${normalizedKey} : ${value ?? "Not Available"}\n`;

      }

    });

    answer +=
      "\n----------------------------------------\n\n";

  }

  // Products
  if (data.products?.length) {
    data.products.forEach(printRecord);
  }

  // Vendors
  if (data.vendors?.length) {
    data.vendors.forEach(printRecord);
  }

  // Quotes
  if (data.quotes?.length) {

    data.quotes.forEach((quote: any) => {

      if (quote.QuoteInfo?.length) {

        quote.QuoteInfo.forEach((info: any) =>
          printRecord(info)
        );

      } else {

        printRecord(quote);

      }

    });

  }

  // Orders
  if (data.orders?.length) {
    data.orders.forEach(printRecord);
  }

  // Vendor Comparison
  if (data.comparison?.length) {
    data.comparison.forEach(printRecord);
  }

  return answer.trim();

}