
function normalize(value: any = ""): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanSpec(value: any = ""): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberValue(value: any): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(
    String(value).replace(/[$,₹]/g, "").trim()
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(
    String(value).replace(/[$,₹]/g, "").trim()
  );

  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: any): number {
  return Number(numberValue(value).toFixed(2));
}

function getProductKey(line: any): string {
  return `${normalize(line?.ProductName)}|${normalize(
    line?.specValue
  )}`;
}

function getProductNameKey(line: any): string {
  return normalize(line?.ProductName);
}

function getQuoteInfo(quote: any): any {
  return quote?.QuoteInfo?.[0] ?? {};
}

function getQuoteLines(quote: any): any[] {
  const info = getQuoteInfo(quote);

  if (Array.isArray(info?.Qlines)) {
    return info.Qlines;
  }

  if (Array.isArray(info?.QuoteLines)) {
    return info.QuoteLines;
  }

  if (Array.isArray(quote?.Qlines)) {
    return quote.Qlines;
  }

  if (Array.isArray(quote?.QuoteLines)) {
    return quote.QuoteLines;
  }

  return [];
}

function getVendorName(info: any): string {
  return String(
    info?.VendorName ||
      info?.vendorName ||
      info?.Vendor ||
      info?.vendor ||
      ""
  ).trim();
}

function getQuoteId(info: any, quote: any): string {
  return String(
    info?.QuoteId ||
      info?.quoteId ||
      quote?.id ||
      ""
  ).trim();
}

function getQuoteNumber(info: any): string {
  return String(
    info?.QuoteNumber ||
      info?.quoteNumber ||
      ""
  ).trim();
}

export function generateTransactionalQuoteReport(
  masterQuote: any,
  vendorQuote: any
): any {
  if (!masterQuote) {
    throw new Error("Master Quote not found");
  }

  if (!vendorQuote) {
    throw new Error("Transactional Quote not found");
  }

  const masterInfo = getQuoteInfo(masterQuote);
  const vendorInfo = getQuoteInfo(vendorQuote);

  const masterLines = getQuoteLines(masterQuote);
  const vendorLines = getQuoteLines(vendorQuote);

  const vendorName =
    getVendorName(vendorInfo) || "Unknown Vendor";

  const vendorQuoteId =
    getQuoteId(vendorInfo, vendorQuote);

  const vendorQuoteNumber =
    getQuoteNumber(vendorInfo);

  console.log(
    "===================================="
  );
  console.log(
    "TRANSACTIONAL REPORT DEBUG"
  );
  console.log(
    "MASTER:",
    masterQuoteNumber(masterInfo)
  );
  console.log(
    "TRANSACTIONAL:",
    vendorQuoteNumber
  );
  console.log(
    "VENDOR:",
    vendorName
  );
  console.log(
    "MASTER LINES:",
    masterLines.length
  );
  console.log(
    "VENDOR LINES:",
    vendorLines.length
  );
  console.log(
    "===================================="
  );

  const products: any[] = [];
  const missingProducts: any[] = [];

  /*
   * Each transactional Qline can be consumed only once.
   *
   * This is important because the Master Quote contains
   * duplicate ProductName values such as Resistor and Transistor.
   */
  const usedVendorIndexes = new Set<number>();

  masterLines.forEach((master: any, masterIndex: number) => {
    const masterProduct =
      normalize(master?.ProductName);

    const masterSpec =
      normalize(master?.specValue);

    /*
     * First attempt:
     * Product + specification
     */
    let vendorIndex = vendorLines.findIndex(
      (vendor: any, index: number) =>
        !usedVendorIndexes.has(index) &&
        normalize(vendor?.ProductName) === masterProduct &&
        normalize(vendor?.specValue) === masterSpec
    );

    let specificationMatch = true;

    /*
     * Second attempt:
     * Same product, different specification.
     *
     * This is a specification mismatch, NOT a missing product.
     */
    if (vendorIndex === -1) {
      vendorIndex = vendorLines.findIndex(
        (vendor: any, index: number) =>
          !usedVendorIndexes.has(index) &&
          normalize(vendor?.ProductName) === masterProduct
      );

      if (vendorIndex !== -1) {
        specificationMatch = false;
      }
    }

    const vendorLine =
      vendorIndex >= 0
        ? vendorLines[vendorIndex]
        : null;

    if (vendorIndex >= 0) {
      usedVendorIndexes.add(vendorIndex);
    }

    const requestedQty =
      numberValue(master?.Quantity);

    const addressedQty =
      vendorLine
        ? numberValue(vendorLine?.Quantity)
        : null;

    const quantityMatch =
      vendorLine !== null &&
      requestedQty === addressedQty;

    const targetPrice =
      nullableNumber(master?.TargetPrice);

    const vendorPrice =
      vendorLine
        ? nullableNumber(vendorLine?.UnitPrice)
        : null;

    const priceMatch =
      vendorLine !== null &&
      specificationMatch &&
      quantityMatch &&
      vendorPrice !== null &&
      targetPrice !== null &&
      vendorPrice <= targetPrice;

    const priceDifference =
      vendorPrice !== null && targetPrice !== null
        ? money(vendorPrice - targetPrice)
        : null;

    const vendorTotal =
      vendorPrice !== null &&
      addressedQty !== null
        ? money(
            vendorPrice * addressedQty
          )
        : null;

    let recommendation =
      "Not Recommended";

    if (!vendorLine) {
      recommendation = "Not Quoted";

      missingProducts.push({
        productName:
          master?.ProductName ?? "",
        specValue:
          cleanSpec(master?.specValue)
      });
    } else if (!specificationMatch) {
      recommendation =
        "Specification Mismatch";
    } else if (!quantityMatch) {
      recommendation =
        "Insufficient Quantity";
    } else if (!priceMatch) {
      recommendation =
        "Above Target";
    } else {
      recommendation =
        "Recommended";
    }

    let remarks = "";

    if (!vendorLine) {
      remarks = "Not Quoted";
    } else if (!specificationMatch) {
      remarks = "Specification Mismatch";
    } else if (!quantityMatch) {
      remarks = "Quantity Mismatch";
    } else if (!priceMatch) {
      remarks = "Price Above Target";
    } else {
      remarks =
        "Quantity and Price Match";
    }

    products.push({
      productName:
        master?.ProductName ?? "",

      specification:
        cleanSpec(master?.specValue),

      requestedQty,

      addressedQty,

      targetPrice:
        targetPrice !== null
          ? money(targetPrice)
          : null,

      vendorPrice:
        vendorPrice !== null
          ? money(vendorPrice)
          : null,

      priceDifference,

      vendorTotal,

      quantityMatch,

      priceMatch,

      specificationMatch,

      specificationStatus:
        !vendorLine
          ? "Missing Product"
          : specificationMatch
            ? "Specification Match"
            : "Specification Mismatch",

      vendorSpecification:
        vendorLine
          ? cleanSpec(vendorLine?.specValue)
          : "",

      recommendation,

      remarks,

      /*
       * IMPORTANT:
       * Vendor information is stored directly on each
       * product row.
       */
      vendor:
        vendorLine
          ? vendorName
          : "",

      vendorName:
        vendorLine
          ? vendorName
          : "",

      quoteId:
        vendorLine
          ? vendorQuoteId
          : "",

      quoteNumber:
        vendorLine
          ? vendorQuoteNumber
          : "",

      quoteType:
        vendorLine
          ? vendorInfo?.QuoteType ||
            "Transactional"
          : "",

      /*
       * Explicit aliases for UI compatibility.
       */
      bestVendor:
        vendorLine
          ? vendorName
          : "",

      bestVendorName:
        vendorLine
          ? vendorName
          : "",

      vendorAddressedQty:
        addressedQty,

      vendorUnitPrice:
        vendorPrice !== null
          ? money(vendorPrice)
          : null
    });
  });

  /*
   * EXTRA PRODUCTS
   *
   * Same ProductName but different specification
   * is NOT extra.
   */
  const masterProductNames = new Set(
    masterLines.map(getProductNameKey)
  );

  const extraProductKeys =
    new Set<string>();

  const extraProducts: any[] = [];

  vendorLines.forEach((vendor: any) => {
    const productNameKey =
      getProductNameKey(vendor);

    if (
      !masterProductNames.has(
        productNameKey
      )
    ) {
      const key =
        getProductKey(vendor);

      if (
        !extraProductKeys.has(key)
      ) {
        extraProductKeys.add(key);

        extraProducts.push({
          productName:
            vendor?.ProductName ?? "",

          specValue:
            cleanSpec(
              vendor?.specValue
            ),

          vendor:
            vendorName,

          quoteId:
            vendorQuoteId,

          quoteNumber:
            vendorQuoteNumber
        });
      }
    }
  });

  const totalProducts =
    masterLines.length;

  const quantityMatchedCount =
    products.filter(
      (product: any) =>
        product.vendorPrice !== null &&
        product.specificationMatch === true &&
        product.quantityMatch === true
    ).length;

  const priceMatchedCount =
    products.filter(
      (product: any) =>
        product.vendorPrice !== null &&
        product.specificationMatch === true &&
        product.quantityMatch === true &&
        product.priceMatch === true
    ).length;

  const qtyMatchPercentage =
    totalProducts > 0
      ? Math.round(
          (quantityMatchedCount /
            totalProducts) *
            100
        )
      : 0;

  const overallPriceMatchPercentage =
    quantityMatchedCount > 0
      ? Math.round(
          (priceMatchedCount /
            quantityMatchedCount) *
            100
        )
      : 0;

  const totalAmount =
    vendorLines.reduce(
      (total: number, line: any) => {
        const unitPrice =
          numberValue(
            line?.UnitPrice
          );

        const quantity =
          numberValue(
            line?.Quantity
          );

        return (
          total +
          unitPrice * quantity
        );
      },
      0
    );

  const comparableQuotedTotal =
    products.reduce(
      (total: number, product: any) => {
        if (
          product.vendorPrice !== null &&
          product.specificationMatch === true &&
          product.quantityMatch === true
        ) {
          return (
            total +
            numberValue(
              product.vendorPrice
            ) *
              numberValue(
                product.requestedQty
              )
          );
        }

        return total;
      },
      0
    );

  const comparableMasterTargetTotal =
    products.reduce(
      (total: number, product: any) => {
        if (
          product.vendorPrice !== null &&
          product.specificationMatch === true &&
          product.quantityMatch === true
        ) {
          return (
            total +
            numberValue(
              product.targetPrice
            ) *
              numberValue(
                product.requestedQty
              )
          );
        }

        return total;
      },
      0
    );

  const comparablePriceDifference =
    money(
      comparableQuotedTotal -
        comparableMasterTargetTotal
    );

  let recommendationSummary =
    "";

  if (
    totalProducts > 0 &&
    qtyMatchPercentage === 100 &&
    overallPriceMatchPercentage === 100 &&
    missingProducts.length === 0 &&
    extraProducts.length === 0
  ) {
    recommendationSummary =
      "All quoted products satisfy the requested specification, quantity, and target pricing.";
  } else if (
    qtyMatchPercentage >= 80 &&
    overallPriceMatchPercentage >= 80
  ) {
    recommendationSummary =
      "Most procurement requirements are satisfied. Manual review is recommended.";
  } else {
    recommendationSummary =
      "Multiple quantity, specification, or pricing mismatches were detected. Review before approval.";
  }

  return {
    mode: "TRANSACTIONAL",

    inputQuoteId:
      vendorQuoteId,

    selectedQuoteId:
      vendorQuoteId,

    selectedQuoteNumber:
      vendorQuoteNumber,

    selectedQuoteName:
      vendorInfo?.QuoteName ?? "",

    selectedQuoteType:
      vendorInfo?.QuoteType ||
      "Transactional",

    selectedVendor:
      vendorName,

    vendor:
      vendorName,

    parentQuoteId:
      masterInfo?.QuoteId ?? "",

    parentQuoteNumber:
      masterInfo?.QuoteNumber ?? "",

    parentQuoteName:
      masterInfo?.QuoteName ?? "",

    quoteId:
      vendorQuoteId,

    quoteName:
      vendorInfo?.QuoteName ?? "",

    quoteNumber:
      vendorQuoteNumber,

    quoteType:
      vendorInfo?.QuoteType ||
      "Transactional",

    totalProducts,

    totalAmount:
      money(totalAmount),

    transactionalTotal:
      money(totalAmount),

    comparableQuotedTotal:
      money(comparableQuotedTotal),

    comparableMasterTargetTotal:
      money(comparableMasterTargetTotal),

    comparablePriceDifference,

    bestCombinedVendorCost:
      money(totalAmount),

    qtyMatchPercentage,

    overallPriceMatchPercentage,

    missingProductCount:
      missingProducts.length,

    extraProductCount:
      extraProducts.length,

    quotedProductCount:
      products.filter(
        (product: any) =>
          product.vendorPrice !== null
      ).length,

    quantityMatchedCount,

    priceMatchedCount,

    missingProducts,

    extraProducts,

    recommendationSummary,

    insights: [
      `Transactional quote from ${vendorName} compared against Master Quote.`,

      `${products.filter(
        (product: any) =>
          product.vendorPrice !== null
      ).length} of ${totalProducts} Master products were quoted by this vendor.`,

      `${quantityMatchedCount} of ${totalProducts} products matched the requested quantity and specification.`,

      `${priceMatchedCount} of ${quantityMatchedCount} quantity- and specification-matched products met the target pricing.`,

      `Quantity compliance: ${qtyMatchPercentage}%`,

      `Pricing compliance: ${overallPriceMatchPercentage}%`,

      `${missingProducts.length} Master products were not quoted by this vendor.`,

      `${extraProducts.length} extra products were detected in the vendor quote.`,

      `Transactional quote total: $${money(
        totalAmount
      ).toFixed(2)}.`,

      `Comparable quoted total: $${money(
        comparableQuotedTotal
      ).toFixed(2)}.`,

      `Comparable Master target total: $${money(
        comparableMasterTargetTotal
      ).toFixed(2)}.`,

      `Comparable price difference versus Master target: $${comparablePriceDifference.toFixed(
        2
      )}.`
    ],

    products
  };
}

function masterQuoteNumber(info: any): string {
  return String(
    info?.QuoteNumber ||
      info?.quoteNumber ||
      ""
  ).trim();
}