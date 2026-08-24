export function formatQuote(quotes: any[]): string {

  let answer = "";

  quotes.forEach((quote: any) => {

    const info = quote.QuoteInfo?.[0];

    if (!info) return;

   answer += `
Quote Number : ${info.QuoteNumber || "Not Available"}

Quote ID : ${info.QuoteId || "Not Available"}

Quote Name : ${info.QuoteName || "Not Available"}

Quote Type : ${info.QuoteType || "Not Available"}

Vendor : ${info.VendorName || "Not Available"}

Date : ${info.DateofSync || "Not Available"}

========================================

`;

    info.Qlines?.forEach((line: any) => {

      answer += `
Product Name : ${line.ProductName || "Not Available"}

Specification : ${line.specValue || "Not Available"}

Quantity : ${line.Quantity || "Not Available"}

Unit Price : ${line.UnitPrice || "Not Available"}

Target Price : ${line.TargetPrice || "Not Available"}

----------------------------------------

`;

    });

  });

  return answer.trim();
}