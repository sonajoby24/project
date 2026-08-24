export function formatProducts(products: any[]): string {

  let answer = "";

  products.forEach((p: any) => {

    answer += `
Product Name : ${p.ProductName || "Not Available"}

Quote Number : ${p.quoteNumber || "Not Available"}

Quote Type : ${p.quoteType || "Not Available"}

Specification : ${p.specValue || "Not Available"}

Quantity : ${p.Quantity || "Not Available"}

Unit Price : ${p.UnitPrice || "Not Available"}

Target Price : ${p.TargetPrice || "Not Available"}

----------------------------------------

`;

  });

  return answer.trim();

}