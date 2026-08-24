import { adminDb } from "@/lib/firebase-admin";

export async function retrieveRelevantData(
  query: string
) {

  const lowerQuery =
    query.toLowerCase();

  // ------------------------------
// Detect User Intent
// ------------------------------

const isShowAllProducts =
  lowerQuery.includes("show all products") ||
  lowerQuery.includes("list all products");

const isShowAllVendors =
  lowerQuery.includes("show all vendors") ||
  lowerQuery.includes("list all vendors");

const isMissingProducts =
  lowerQuery.includes("missing products");

const isExtraProducts =
  lowerQuery.includes("extra products");

const isWrongSpecs =
  lowerQuery.includes("wrong specs") ||
  lowerQuery.includes("spec mismatch") ||
  lowerQuery.includes("wrong specification");

const isCompareQuotes =
  lowerQuery.includes("compare quote");

const isProcurementSummary =
  lowerQuery.includes("procurement summary") ||
  lowerQuery.includes("quote summary");

const isVendorComparison =
  lowerQuery.includes("best vendor") ||
  lowerQuery.includes("compare vendors") ||
  lowerQuery.includes("cheapest vendor");

const isProductSearch =
  lowerQuery.includes("product") ||
  lowerQuery.includes("details") ||
  lowerQuery.includes("spec");

 const productNameMatch = query.match(
  /(?:show details of|details of|specvalue of|specification of|product)\s+(?:productname\s*)?["']?([^"']+)["']?/i
);

const quoteNumberMatch =
  query.match(/\b\d{8}\b/);

  const data: any = {};

  try {
  
  // --------------------------
// QUOTE NUMBER SEARCH
// --------------------------

if (quoteNumberMatch) {

  const quoteNumber =
    quoteNumberMatch[0];

  const snapshot =
    await adminDb
      .collection("quotes")
      .get();
  let foundQuote = null;

  snapshot.forEach((doc) => {

    const quote = doc.data();

    const info =
      quote?.QuoteInfo?.[0];

    if (
      String(info?.QuoteNumber) ===
      quoteNumber
    ) {

      foundQuote = {
        id: doc.id,
        ...quote,
      };

    }

  });
  if (foundQuote) {
  data.quote = foundQuote;
}
  return data;

}

    // --------------------------
    // QUOTE SEARCH
    // --------------------------
  
    const quoteMatch =
      query.match(/0Q0[a-zA-Z0-9]+/);

    if (quoteMatch) {

      const quoteId =
        quoteMatch[0];

      const snapshot =
        await adminDb
          .collection("quotes")
          .get();

      snapshot.forEach((doc) => {

        const quote =
          doc.data();

        const parentQuoteId =
          quote?.QuoteInfo?.[0]
            ?.ParentQuoteID;

        const actualQuoteId =
          quote?.QuoteInfo?.[0]
            ?.QuoteId;

        if (
          parentQuoteId === quoteId ||
          actualQuoteId === quoteId
        ) {

          data.quote = {
            id: doc.id,
            ...quote,
          };

        }

      });

      return data;
    }
    
    // --------------------------
// PRODUCT NAME SEARCH IN QUOTES
// --------------------------

if (productNameMatch) {

 const searchName = productNameMatch[1]
  .replace(/productname/gi, "")
  .replace(/"/g, "")
  .trim()
  .toLowerCase();

console.log("SEARCH NAME:", searchName);
    
  console.log("SEARCH NAME:", searchName);

  const snapshot =
    await adminDb
      .collection("quotes")
      .get();

  const matches:any[] = [];

  snapshot.forEach((doc) => {

    const quote =
      doc.data();

    const qlines =
      quote?.QuoteInfo?.[0]?.Qlines || [];

    qlines.forEach((item:any) => {
    
    console.log("DATABASE PRODUCT:", item.ProductName);

      if (
        item.ProductName &&
        item.ProductName
          .toLowerCase()
          .includes(searchName)
      ) {
        console.log("MATCH FOUND:", item.ProductName);
        
        matches.push({

          quoteId:
            quote?.QuoteInfo?.[0]?.QuoteId,

          quoteNumber:
            quote?.QuoteInfo?.[0]?.QuoteNumber,

          quoteType:
            quote?.QuoteInfo?.[0]?.QuoteType,

          ProductName:
            item.ProductName,

          specValue:
            item.specValue,

          Quantity:
            item.Quantity,

          UnitPrice:
            item.UnitPrice,

          TargetPrice:
            item.TargetPrice

        });

      }

    });

  });

  data.products = matches;

  return data;

}

    // --------------------------
    // PRODUCT SEARCH
    // --------------------------

    const productMatch =
      query.match(/P\d+/i);

    if (productMatch) {

      const productId =
        productMatch[0];

      const snapshot =
        await adminDb
          .collection("products")
          .get();

      snapshot.forEach((doc) => {

        const product =
          doc.data();

        if (
          product.productId === productId ||
          doc.id === productId
        ) {

          data.product = {
            id: doc.id,
            ...product,
          };

        }

      });

      return data;
    }

    // --------------------------
    // VENDOR SEARCH
    // --------------------------

    const vendorMatch =
      query.match(/VEND-\d+/i);

    if (vendorMatch) {

      const vendorId =
        vendorMatch[0];

      const snapshot =
        await adminDb
          .collection("vendor")
          .get();

      snapshot.forEach((doc) => {

        const vendor =
          doc.data();

        if (
          vendor.vendorId === vendorId ||
          vendor.Vendor === vendorId ||
          doc.id === vendorId
        ) {

          data.vendor = {
            id: doc.id,
            ...vendor,
          };

        }

      });

      return data;
    }

    // --------------------------
    // ORDER SEARCH
    // --------------------------

    const orderMatch =
      query.match(/ORD\d+/i);

    if (orderMatch) {

      const orderId =
        orderMatch[0];

      const snapshot =
        await adminDb
          .collection("orders")
          .get();

      snapshot.forEach((doc) => {

        const order =
          doc.data();

        if (
          order.orderId === orderId ||
          doc.id === orderId
        ) {

          data.order = {
            id: doc.id,
            ...order,
          };

        }

      });

      return data;
    }

    // --------------------------
    // GENERAL PRODUCTS
    // --------------------------

    if (
  lowerQuery.includes("product") ||
  lowerQuery.includes("products") ||
  lowerQuery.includes("item") ||
  lowerQuery.includes("spec") ||
  lowerQuery.includes("specvalue") ||
  lowerQuery.includes("specification")
)
    
    {

      const snapshot =
        await adminDb
          .collection("products")
          .limit(20)
          .get();

      data.products =
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

      return data;
    }

    // --------------------------
    // GENERAL QUOTES
    // --------------------------

    if (
      lowerQuery.includes("quote") ||
      lowerQuery.includes("quotes")
    ) {

      const snapshot =
        await adminDb
          .collection("quotes")
          .limit(20)
          .get();

      data.quotes =
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

      return data;
    }

    // --------------------------
    // GENERAL VENDORS
    // --------------------------

    if (
      lowerQuery.includes("vendor") ||
      lowerQuery.includes("supplier")
    ) {

      const snapshot =
        await adminDb
          .collection("vendor")
          .limit(20)
          .get();

      data.vendors =
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

      return data;
    }

    // --------------------------
    // GENERAL ORDERS
    // --------------------------

    if (
      lowerQuery.includes("order")
    ) {

      const snapshot =
        await adminDb
          .collection("orders")
          .limit(20)
          .get();

      data.orders =
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

      return data;
    }

    // --------------------------
    // DEFAULT
    // --------------------------
data.message =
"No matching Firebase records found.";

data.tip =
"Try searching by Quote Number, Quote ID, Product Name, Vendor ID or Product ID.";

    return data;

  } catch (error) {

    console.error(
      "RETRIEVAL ERROR:",
      error
    );

    return {
      error:
        "Failed to retrieve Firebase data",
    };
  }
}