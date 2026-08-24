export function recommendVendor(comparison: any[]) {

  if (!comparison || comparison.length === 0) {
    return null;
  }

  // Ignore Master Quote
  const vendorRows = comparison.filter(
    x => x.vendor !== "Master Quote"
  );

  if (vendorRows.length === 0) {
    return null;
  }

  // Calculate total quote value for each vendor
  const totals: any = {};

  vendorRows.forEach((row) => {

    if (!totals[row.vendor]) {
      totals[row.vendor] = 0;
    }

    totals[row.vendor] += row.unitPrice * row.quantity;

  });

  // Find vendor with lowest total cost
  let bestVendor = "";
  let lowestTotal = Number.MAX_VALUE;

  Object.entries(totals).forEach(([vendor, total]) => {

    if ((total as number) < lowestTotal) {
      lowestTotal = total as number;
      bestVendor = vendor;
    }

  });

  return {
    vendor: bestVendor,
    price: lowestTotal,
    reason: "Lowest overall quotation among all vendors."
  };

}