import { adminDb } from "@/lib/firebase-admin";

export async function retrieveQuoteLineProducts(
  productName: string,
  fields: string[] = []
) {
  const searchName =
  productName
    .trim()
    .toLowerCase();

console.log("SEARCH PRODUCT:", searchName);
  const snapshot =
    await adminDb
      .collection("quotes")
      .get();

  const matches: any[] = [];

  snapshot.forEach((doc) => {

    const quote = doc.data();

    const qlines =
      quote?.QuoteInfo?.[0]?.Qlines || [];

    qlines.forEach((item: any) => {

      if (

        item.ProductName &&

        item.ProductName
          .toLowerCase()
          .includes(searchName)

      ) {

        const record: any = {
  quoteId: quote?.QuoteInfo?.[0]?.QuoteId,
  quoteNumber: quote?.QuoteInfo?.[0]?.QuoteNumber,
  quoteType: quote?.QuoteInfo?.[0]?.QuoteType,
  ProductName: item.ProductName
};

const normalizedFields = fields.map(f => f.toLowerCase());

const wantsSpecification =
  normalizedFields.includes("specification") ||
  normalizedFields.includes("specvalue");

const wantsPrice =
  normalizedFields.includes("price") ||
  normalizedFields.includes("unitprice");

const wantsQuantity =
  normalizedFields.includes("quantity");

const wantsTargetPrice =
  normalizedFields.includes("targetprice") ||
  normalizedFields.includes("target price");

if (fields.length === 0 || wantsSpecification) {
  record.specValue = item.specValue;
}

if (fields.length === 0 || wantsPrice) {
  record.UnitPrice = item.UnitPrice;
}

if (fields.length === 0 || wantsQuantity) {
  record.Quantity = item.Quantity;
}

if (fields.length === 0 || wantsTargetPrice) {
  record.TargetPrice = item.TargetPrice;
}

matches.push(record);
      }

    });

  });

  return {

    products: matches,

  };

}