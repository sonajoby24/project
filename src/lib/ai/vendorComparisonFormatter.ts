export function formatVendorComparison(
  comparison: any[],
  question: string
): string {

  if (!comparison.length) {
    return "No vendors found.";
  }

  const q = question.toLowerCase();

  // Remove duplicate vendors by name
  const unique = new Map<string, any>();

  comparison.forEach((vendor) => {
    if (!unique.has(vendor.vendorName)) {
      unique.set(vendor.vendorName, vendor);
    }
  });

  const vendors = [...unique.values()];

  // -----------------------------
  // BEST VENDOR
  // -----------------------------
  if (
    q.includes("best vendor") ||
    q.includes("which vendor is the best")
  ) {

    const rated = vendors.filter(
      (v) => v.rating != null
    );

    if (!rated.length) {

      return `Unable to determine the best vendor.

Reason:

The current Firebase vendor records contain:

• Vendor Name
• Account ID
• Email
• Phone
• Status

The following comparison fields are missing:

• Rating
• Delivery Days
• Total Orders

Therefore a best vendor recommendation cannot be generated from the available data.`;

    }

    rated.sort((a, b) => b.rating - a.rating);

    return `Best Vendor

Vendor Name : ${rated[0].vendorName}

Rating : ${rated[0].rating}`;
  }

  // -----------------------------
  // HIGHEST RATING
  // -----------------------------
  if (
    q.includes("highest rating")
  ) {

    const rated = vendors.filter(
      (v) => v.rating != null
    );

    if (!rated.length) {
      return "Rating information is not available for any vendor.";
    }

    rated.sort((a, b) => b.rating - a.rating);

    return `Highest Rated Vendor

Vendor Name : ${rated[0].vendorName}

Rating : ${rated[0].rating}`;
  }

  // -----------------------------
  // NORMAL COMPARISON
  // -----------------------------
  let answer = "Vendor Comparison\n\n";

  vendors.forEach((vendor) => {

    answer +=
`Vendor Name : ${vendor.vendorName || "Not Available"}
Account ID : ${vendor.accountId || "Not Available"}
Email : ${vendor.email || "Not Available"}
Phone : ${vendor.phone || "Not Available"}
Status : ${vendor.status || "Not Available"}
Rating : ${vendor.rating ?? "Not Available"}
Delivery Days : ${vendor.deliveryDays ?? "Not Available"}

----------------------------------------

`;

  });
if (
  comparison.length &&
  comparison[0].cheapestVendor
) {

  answer +=
`\nCheapest Vendor

Vendor : ${comparison[0].cheapestVendor.vendor}

Average Price : ${comparison[0].cheapestVendor.averagePrice}

`;

}

  return answer.trim();
}