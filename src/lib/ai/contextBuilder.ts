export function buildContext(data: any): string {

  let context = "";

  // -----------------------------
  // PRODUCTS
  // -----------------------------
  if (Array.isArray(data.products) && data.products.length) {

    context += "\nPRODUCTS\n";

    data.products.forEach((p: any) => {

      context += `
Product Name : ${p.ProductName || p.name || "Not Available"}

Quote Number : ${p.quoteNumber || "Not Available"}

Quote Type : ${p.quoteType || "Not Available"}

Specification : ${p.specValue || "Not Available"}

Quantity : ${p.Quantity || "Not Available"}

Unit Price : ${p.UnitPrice || "Not Available"}

Target Price : ${p.TargetPrice || "Not Available"}

`;

    });

  }

  // -----------------------------
  // QUOTE LINES
  // Only include if Product Master returned no matches
  // -----------------------------
  if (
    (!Array.isArray(data.products) || data.products.length === 0) &&
    data.quoteLines &&
    Array.isArray(data.quoteLines.products) &&
    data.quoteLines.products.length
  ) {

    context += "\nQUOTE LINE PRODUCTS\n";

    data.quoteLines.products.forEach((p: any) => {

      context += `
Product Name : ${p.ProductName || "Not Available"}

Quote Number : ${p.quoteNumber || "Not Available"}

Quote Type : ${p.quoteType || "Not Available"}

Specification : ${p.specValue || "Not Available"}

Quantity : ${p.Quantity || "Not Available"}

Unit Price : ${p.UnitPrice || "Not Available"}

Target Price : ${p.TargetPrice || "Not Available"}

`;

    });

  }

  // -----------------------------
  // VENDORS
  // -----------------------------
  if (Array.isArray(data.vendors) && data.vendors.length) {

    context += "\nVENDORS\n";

    data.vendors.forEach((v: any) => {

     context += `
Vendor : ${v.Name || v.vendorName || v.Vendor || "Not Available"}

Account ID : ${v.AccountId || "Not Available"}

Email : ${v.Email || "Not Available"}

Phone : ${v.Phone || "Not Available"}

Status : ${v.Status || "Not Available"}

Rating : ${v.rating || "Not Available"}

Delivery Days : ${v.deliveryDays || "Not Available"}

`;

    });

  }

  
 // -----------------------------
// QUOTES
// -----------------------------
if (Array.isArray(data.quotes) && data.quotes.length) {

  context += "\nQUOTES\n";

  data.quotes.forEach((q: any) => {

    const info = q.QuoteInfo?.[0];

    context += `
Quote Number : ${info?.QuoteNumber || "Not Available"}

Quote ID : ${info?.QuoteId || "Not Available"}

Quote Name : ${info?.QuoteName || "Not Available"}

Quote Type : ${info?.QuoteType || "Not Available"}

Vendor : ${info?.VendorName || "Not Available"}

Date : ${info?.DateofSync || "Not Available"}

`;

if (info?.Qlines?.length) {

  context += "\nPRODUCTS IN THIS QUOTE\n";

  info.Qlines.forEach((line: any) => {

    context += `
Product Name : ${line.ProductName || "Not Available"}

Specification : ${line.specValue || "Not Available"}

Quantity : ${line.Quantity || "Not Available"}

Unit Price : ${line.UnitPrice || "Not Available"}

Target Price : ${line.TargetPrice || "Not Available"}

`;

  });

}

    // -----------------------
    // Quote Line Products
    // -----------------------

    if (Array.isArray(info?.Qlines)) {

      info.Qlines.forEach((item: any) => {

        context += `
Product Name : ${item.ProductName || "Not Available"}

Specification : ${item.specValue || "Not Available"}

Quantity : ${item.Quantity || "Not Available"}

Unit Price : ${item.UnitPrice || "Not Available"}

Target Price : ${item.TargetPrice || "Not Available"}

`;

      });

    }

  });

}

  return context;
}