export function formatVendorComparison(
  comparison: any,
  question: string
): string {

  if (!comparison) {
    return "No vendor comparison information is available.";
  }

  const q =
    question.toLowerCase();

  // ============================================================
  // CHEAPEST VENDOR
  // ============================================================

  if (
    q.includes("cheapest") ||
    q.includes("lowest price") ||
    q.includes("least expensive")
  ) {

    const cheapest =
      comparison.cheapestVendor;

    if (!cheapest) {
      return (
        "Unable to determine the cheapest vendor " +
        "from the available quote data."
      );
    }

    return `
Cheapest Vendor

Vendor : ${cheapest.vendor}

Average Price : ${cheapest.averagePrice}

The average price is calculated from the available
priced quote lines for each vendor.
`.trim();
  }


  // ============================================================
  // CHEAPEST VENDOR BY PRODUCT
  // ============================================================

  if (
    comparison.cheapestByProduct?.length
  ) {

    let answer =
      "Vendor Price Comparison\n\n";

    comparison.cheapestByProduct.forEach(
      (item: any) => {

        answer +=
`Product : ${item.product}
Cheapest Vendor : ${item.vendor}
Unit Price : ${item.unitPrice}
Quote Number : ${item.quoteNumber || "Not Available"}
Quote Type : ${item.quoteType || "Not Available"}

`;

      }
    );

    return answer.trim();
  }


  // ============================================================
  // GENERAL COMPARISON
  // ============================================================

  if (
    comparison.vendors?.length
  ) {

    let answer =
      "Vendor Price Comparison\n\n";

    comparison.vendors.forEach(
      (vendor: any) => {

        answer +=
`Vendor : ${vendor.vendor}
Average Price : ${vendor.averagePrice}

`;

      }
    );

    return answer.trim();
  }


  return (
    "No vendor comparison information is available."
  );
}