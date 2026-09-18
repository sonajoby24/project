function normalize(value: any = ""): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getVendor(line: any): string {
  return String(
    line?.VendorName ??
    line?.vendor ??
    line?.Vendor ??
    ""
  ).trim();
}

function getProduct(line: any): string {
  return String(
    line?.ProductName ??
    line?.product ??
    line?.Product ??
    ""
  ).trim();
}

function getSpecification(line: any): string {
  return String(
    line?.specValue ??
    line?.Specification ??
    line?.specification ??
    line?.VendorSpecification ??
    ""
  ).trim();
}

function getUnitPrice(line: any): number {
  return Number(
    line?.UnitPrice ??
    line?.unitPrice ??
    line?.Price
  );
}

function getQuantity(line: any): any {
  return (
    line?.Quantity ??
    line?.quantity ??
    null
  );
}

function getQuoteId(line: any): string {
  return String(
    line?.quoteId ??
    line?.QuoteID ??
    line?.QuoteId ??
    ""
  ).trim();
}

function getQuoteNumber(line: any): string {
  return String(
    line?.quoteNumber ??
    line?.QuoteNumber ??
    ""
  ).trim();
}

function getQuoteType(line: any): string {
  return String(
    line?.quoteType ??
    line?.QuoteType ??
    ""
  ).trim();
}

/**
 * Product + specification is the identity of an item
 * for vendor comparison.
 *
 * Example:
 *
 * Header | 100mil, 2x1
 * Header | 100mil, 3x1
 * Header | 100mil, 4x1
 *
 * are three different comparison items.
 */
function comparisonKey(
  product: string,
  specification: string
): string {
  return `${normalize(product)}::${normalize(
    specification
  )}`;
}

export function compareVendorQuotes(
  quoteLines: any[]
) {
  const items: any[] = [];

  // ============================================================
  // BUILD VALID COMPARISON ITEMS
  // ============================================================

  for (const line of quoteLines ?? []) {

    // ----------------------------------------------------------
    // MASTER QUOTES ARE NOT VENDORS
    // ----------------------------------------------------------

    if (
      normalize(getQuoteType(line)) ===
      "master"
    ) {
      continue;
    }

    const vendor =
      getVendor(line);

    const product =
      getProduct(line);

    const specification =
      getSpecification(line);

    const rawUnitPrice =
      line?.UnitPrice ??
      line?.unitPrice ??
      line?.Price;

    const unitPrice =
      Number(rawUnitPrice);

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (!vendor || !product) {
      continue;
    }

    if (
      normalize(vendor) ===
      "unknown vendor"
    ) {
      continue;
    }

    if (
      rawUnitPrice === null ||
      rawUnitPrice === undefined ||
      rawUnitPrice === ""
    ) {
      continue;
    }

    if (!Number.isFinite(unitPrice)) {
      continue;
    }

    items.push({
      vendor,
      product,
      specification,
      unitPrice,

      quoteId:
        getQuoteId(line),

      quoteNumber:
        getQuoteNumber(line),

      quoteType:
        getQuoteType(line),

      Quantity:
        getQuantity(line)
    });
  }

  // ============================================================
  // DEDUPLICATE IDENTICAL QUOTE LINES
  // ============================================================
  //
  // The same vendor can sometimes appear more than once for the
  // same product/specification/price/quote.
  //
  // Do not let duplicate records artificially influence the
  // vendor's average price.
  //
  // ============================================================

  const uniqueItems: any[] = [];

  const seen = new Set<string>();

  for (const item of items) {

    const key = [
      normalize(item.vendor),
      normalize(item.product),
      normalize(item.specification),
      item.unitPrice,
      normalize(item.quoteId),
      normalize(item.quoteNumber)
    ].join("::");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueItems.push(item);
  }

  // ============================================================
  // PRODUCT + SPECIFICATION GROUPS
  // ============================================================

  const productGroups =
    new Map<string, any[]>();

  for (const item of uniqueItems) {

    const key =
      comparisonKey(
        item.product,
        item.specification
      );

    if (!key) {
      continue;
    }

    if (
      !productGroups.has(key)
    ) {
      productGroups.set(
        key,
        []
      );
    }

    productGroups
      .get(key)!
      .push(item);
  }

  // ============================================================
  // CHEAPEST VENDOR BY PRODUCT + SPECIFICATION
  // ============================================================

  const cheapestByProduct:
    any[] = [];

  for (
    const [
      key,
      productItems
    ] of productGroups
  ) {

    if (
      productItems.length === 0
    ) {
      continue;
    }

    const sorted =
      [...productItems]
        .sort(
          (a, b) =>
            a.unitPrice -
            b.unitPrice
        );

    const cheapestPrice =
      sorted[0].unitPrice;

    const cheapestItems =
      sorted.filter(
        (item) =>
          Math.abs(
            item.unitPrice -
            cheapestPrice
          ) < 0.000001
      );

    const first =
      sorted[0];

    cheapestByProduct.push({

      // Keep the actual display values.
      product:
        first.product,

      specification:
        first.specification,

      // --------------------------------------------------------
      // Backward-compatible single vendor field
      // --------------------------------------------------------

      vendor:
        cheapestItems.length === 1
          ? cheapestItems[0].vendor
          : cheapestItems
              .map(
                (item) =>
                  item.vendor
              )
              .join(", "),

      unitPrice:
        cheapestPrice,

      quoteNumber:
        cheapestItems.length === 1
          ? cheapestItems[0].quoteNumber
          : "",

      quoteId:
        cheapestItems.length === 1
          ? cheapestItems[0].quoteId
          : "",

      quoteType:
        cheapestItems.length === 1
          ? cheapestItems[0].quoteType
          : "",

      // --------------------------------------------------------
      // Detailed tie information
      // --------------------------------------------------------

      vendors:
        cheapestItems.map(
          (item) => ({
            vendor:
              item.vendor,

            unitPrice:
              item.unitPrice,

            quoteNumber:
              item.quoteNumber,

            quoteId:
              item.quoteId,

            quoteType:
              item.quoteType
          })
        ),

      cheapestPrice,

      priceTie:
        cheapestItems.length > 1,

      allVendors:
        sorted.map(
          (item) => ({
            vendor:
              item.vendor,

            unitPrice:
              item.unitPrice,

            quoteNumber:
              item.quoteNumber,

            quoteId:
              item.quoteId,

            quoteType:
              item.quoteType
          })
        )
    });
  }

  // ============================================================
  // VENDOR → PRODUCT + SPECIFICATION → PRICE
  // ============================================================

  const vendorProducts =
    new Map<
      string,
      Map<string, number>
    >();

  for (
    const item of uniqueItems
  ) {

    const vendorKey =
      normalize(item.vendor);

    const productKey =
      comparisonKey(
        item.product,
        item.specification
      );

    if (
      !vendorProducts.has(
        vendorKey
      )
    ) {
      vendorProducts.set(
        vendorKey,
        new Map<
          string,
          number
        >()
      );
    }

    const vendorMap =
      vendorProducts.get(
        vendorKey
      )!;

    // ----------------------------------------------------------
    // If the same vendor has duplicate records for the same
    // product/specification, keep the lowest valid price.
    // ----------------------------------------------------------

    const existing =
      vendorMap.get(
        productKey
      );

    if (
      existing === undefined ||
      item.unitPrice < existing
    ) {
      vendorMap.set(
        productKey,
        item.unitPrice
      );
    }
  }

  // ============================================================
  // VENDOR DISPLAY NAMES
  // ============================================================

  const vendorDisplayNames =
    new Map<string, string>();

  for (
    const item of uniqueItems
  ) {

    const key =
      normalize(item.vendor);

    if (
      !vendorDisplayNames.has(key)
    ) {
      vendorDisplayNames.set(
        key,
        item.vendor
      );
    }
  }

  const vendorNames =
    Array.from(
      vendorProducts.keys()
    );

  // ============================================================
  // COMMON PRODUCT + SPECIFICATION COMBINATIONS
  // ============================================================
  //
  // A product is considered common only when the EXACT same
  // product AND specification is quoted by every vendor.
  //
  // ============================================================

  const commonProducts =
    vendorNames.length > 0
      ? Array.from(
          vendorProducts
            .get(
              vendorNames[0]
            )!
            .keys()
        ).filter(
          (productKey) =>
            vendorNames.every(
              (vendor) =>
                vendorProducts
                  .get(vendor)!
                  .has(
                    productKey
                  )
            )
        )
      : [];

  // ============================================================
  // VENDOR SUMMARY
  // ============================================================

  const vendors =
    vendorNames
      .map((vendorKey) => {

        const prices =
          commonProducts.map(
            (productKey) =>
              vendorProducts
                .get(
                  vendorKey
                )!
                .get(
                  productKey
                )!
          );

        const total =
          prices.reduce(
            (sum, price) =>
              sum + price,
            0
          );

        const average =
          prices.length > 0
            ? total /
              prices.length
            : 0;

        return {
          vendor:
            vendorDisplayNames.get(
              vendorKey
            ) ||
            vendorKey,

          commonProducts:
            commonProducts.length,

          totalPrice:
            total,

          averagePrice:
            average,

          prices
        };
      })
      .filter(
        (vendor) =>
          vendor.commonProducts >
          0
      )
      .sort(
        (a, b) =>
          a.averagePrice -
          b.averagePrice
      );

  // ============================================================
  // CHEAPEST / BEST VENDOR
  // ============================================================

  let cheapestVendor:
    | any
    | undefined;

  if (
    vendors.length > 0
  ) {

    const lowestAverage =
      vendors[0]
        .averagePrice;

    const cheapestVendors =
      vendors.filter(
        (vendor) =>
          Math.abs(
            vendor.averagePrice -
            lowestAverage
          ) < 0.000001
      );

    cheapestVendor = {

      // --------------------------------------------------------
      // IMPORTANT:
      // The formatter expects `vendor`.
      // --------------------------------------------------------

      vendor:
        cheapestVendors.length === 1
          ? cheapestVendors[0].vendor
          : cheapestVendors
              .map(
                (vendor) =>
                  vendor.vendor
              )
              .join(", "),

      vendors:
        cheapestVendors.map(
          (vendor) =>
            vendor.vendor
        ),

      averagePrice:
        lowestAverage,

      commonProducts:
        commonProducts.length,

      priceTie:
        cheapestVendors.length >
        1
    };
  }

  // ============================================================
  // DEBUG
  // ============================================================

  console.log(
    "================================="
  );

  console.log(
    "VENDOR COMPARATOR RESULT"
  );

  console.log(
    "Raw comparison items:",
    items.length
  );

  console.log(
    "Unique comparison items:",
    uniqueItems.length
  );

  console.log(
    "Vendors:",
    Array.from(
      vendorDisplayNames.values()
    )
  );

  console.log(
    "Common product/specifications:",
    commonProducts
  );

  console.log(
    "Cheapest by product/specification:",
    JSON.stringify(
      cheapestByProduct,
      null,
      2
    )
  );

  console.log(
    "Cheapest vendor:",
    JSON.stringify(
      cheapestVendor,
      null,
      2
    )
  );

  console.log(
    "================================="
  );

  // ============================================================
  // RETURN
  // ============================================================

  return {
    items:
      uniqueItems,

    cheapestByProduct,

    cheapestVendor,

    vendors,

    commonProducts
  };
}