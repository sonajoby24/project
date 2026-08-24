export function recommendVendor(comparison: any[]) {

  if (!comparison.length)
    return null;

  let best = comparison[0];

  comparison.forEach(item => {

    if (item.unitPrice < best.unitPrice) {

      best = item;

    }

  });

  return {

    preferredVendor: best.vendor,

    product: best.product,

    price: best.unitPrice,

    reason:
      "Lowest unit price among retrieved vendors."

  };

}