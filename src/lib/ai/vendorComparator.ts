export function compareVendorQuotes(
  quoteLines: any[]
) {
  const items: any[] = [];

  // ============================================================
  // BUILD COMPARISON ITEMS
  // ============================================================

  for (const line of quoteLines ?? []) {

    // Master quotes are not vendors
    if (
      String(line.quoteType || "").toLowerCase() === "master"
    ) {
      continue;
    }

    const vendor =
      line.VendorName ||
      line.vendor;

    const product =
      line.ProductName ||
      line.product;

    const unitPrice =
      Number(line.UnitPrice);

    // Ignore incomplete records
    if (!vendor || !product) {
      continue;
    }

    // Ignore unknown vendors
    if (
      String(vendor).toLowerCase() === "unknown vendor"
    ) {
      continue;
    }

    if (!Number.isFinite(unitPrice)) {
      continue;
    }

    items.push({
      vendor: String(vendor).trim(),
      product: String(product).trim(),
      unitPrice,
      quoteId: line.quoteId,
      quoteNumber: line.quoteNumber,
      quoteType: line.quoteType
    });
  }

  // ============================================================
  // GROUP PRODUCTS
  // ============================================================

  const productGroups =
    new Map<string, any[]>();

  for (const item of items) {

    const key =
      item.product.toLowerCase().trim();

    if (!productGroups.has(key)) {
      productGroups.set(key, []);
    }

    productGroups
      .get(key)!
      .push(item);
  }

  // ============================================================
  // CHEAPEST VENDOR BY PRODUCT
  // ============================================================

  const cheapestByProduct: any[] = [];

  for (const [product, productItems] of productGroups) {

    const sorted =
      [...productItems]
        .sort(
          (a, b) =>
            a.unitPrice - b.unitPrice
        );

    const cheapestPrice =
      sorted[0]?.unitPrice;

    const cheapestVendors =
      sorted.filter(
        item =>
          item.unitPrice === cheapestPrice
      );

    cheapestByProduct.push({

      product,

      // Keep all vendors when there is a price tie
      vendors:
        cheapestVendors.map(item => ({
          vendor: item.vendor,
          unitPrice: item.unitPrice,
          quoteNumber: item.quoteNumber,
          quoteId: item.quoteId
        })),

      cheapestPrice,

      priceTie:
        cheapestVendors.length > 1,

      allVendors:
        sorted.map(item => ({
          vendor: item.vendor,
          unitPrice: item.unitPrice,
          quoteNumber: item.quoteNumber,
          quoteId: item.quoteId
        }))
    });
  }

  // ============================================================
  // VENDOR PRICES
  // ============================================================

  const vendorProducts =
    new Map<string, Map<string, number>>();

  for (const item of items) {

    if (!vendorProducts.has(item.vendor)) {
      vendorProducts.set(
        item.vendor,
        new Map<string, number>()
      );
    }

    vendorProducts
      .get(item.vendor)!
      .set(
        item.product.toLowerCase().trim(),
        item.unitPrice
      );
  }

  // ============================================================
  // FIND COMMON PRODUCTS
  // ============================================================

  const vendorNames =
    Array.from(vendorProducts.keys());

  const commonProducts =
    vendorNames.length > 0
      ? Array.from(
          vendorProducts
            .get(vendorNames[0])!
            .keys()
        ).filter(product =>
          vendorNames.every(vendor =>
            vendorProducts
              .get(vendor)!
              .has(product)
          )
        )
      : [];

  // ============================================================
  // COMPARE VENDORS USING COMMON PRODUCTS ONLY
  // ============================================================

  const vendors =
    vendorNames
      .map(vendor => {

        const prices =
          commonProducts.map(
            product =>
              vendorProducts
                .get(vendor)!
                .get(product)!
          );

        const total =
          prices.reduce(
            (sum, price) =>
              sum + price,
            0
          );

        const average =
          prices.length > 0
            ? total / prices.length
            : 0;

        return {
          vendor,
          commonProducts:
            commonProducts.length,
          totalPrice: total,
          averagePrice: average,
          prices
        };
      })
      .filter(
        vendor =>
          vendor.commonProducts > 0
      )
      .sort(
        (a, b) =>
          a.averagePrice -
          b.averagePrice
      );

  // ============================================================
  // CHEAPEST VENDOR
  // ============================================================

  let cheapestVendor:
    | any
    | undefined = undefined;

  if (vendors.length > 0) {

    const lowestAverage =
      vendors[0].averagePrice;

    const cheapestVendors =
      vendors.filter(
        vendor =>
          Math.abs(
            vendor.averagePrice -
            lowestAverage
          ) < 0.000001
      );

    cheapestVendor = {

      vendors:
        cheapestVendors.map(
          vendor => vendor.vendor
        ),

      averagePrice:
        lowestAverage,

      commonProducts:
        commonProducts.length,

      priceTie:
        cheapestVendors.length > 1
    };
  }

  // ============================================================
  // RETURN
  // ============================================================

  return {

    items,

    cheapestByProduct,

    cheapestVendor,

    vendors,

    commonProducts

  };
}