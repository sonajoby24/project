function clean(value: any): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numberValue(
  value: any
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const n =
    Number(
      String(value)
        .replace(/[^0-9.-]/g, "")
    );

  return Number.isFinite(n)
    ? n
    : null;
}

function money(
  value: any
): string {
  const n =
    numberValue(value);

  if (n === null) {
    return "Not Available";
  }

  return `$${n.toFixed(2)}`;
}

function formatRatingComparison(
  data: any
): string {
  if (
    !data ||
    data.type !== "RATING"
  ) {
    return "";
  }

  if (
    !Array.isArray(data.vendors) ||
    data.vendors.length === 0
  ) {
    return (
      "No vendor rating information was found in Firebase."
    );
  }

  const highest =
    numberValue(
      data.highestRating
    );

  const names =
    Array.isArray(
      data.highestRatedVendors
    )
      ? data.highestRatedVendors
      : [];

  if (
    names.length === 0 ||
    highest === null
  ) {
    return (
      "No vendor rating information was found in Firebase."
    );
  }

  const vendorText =
    names.length === 1
      ? names[0]
      : names.slice(0, -1).join(", ") +
        " and " +
        names[names.length - 1];

  let result = "";

  if (
    data.ratingTie === true
  ) {
    result =
      `Result : Rating Tie\n\n` +
      `${vendorText} have the same highest rating of ${highest}.`;
  } else {
    result =
      `Result : Highest Rating\n\n` +
      `${vendorText} has the highest rating of ${highest}.`;
  }

  return (
    `Vendor Rating Result\n\n` +
    `Vendor : ${vendorText}\n\n` +
    `Rating : ${highest}\n\n` +
    result
  );
}

function formatPriceComparison(
  data: any
): string {
  if (
    !data
  ) {
    return "";
  }

  const cheapest =
    data?.cheapestVendor;

  if (
    !cheapest
  ) {
    return (
      "No comparable vendor price information was found in Firebase."
    );
  }

  const vendors =
    Array.isArray(
      cheapest?.vendors
    )
      ? cheapest.vendors
      : clean(
          cheapest?.vendor
        )
          .split(",")
          .map(
            (v: string) =>
              v.trim()
          )
          .filter(Boolean);

  if (
    vendors.length === 0
  ) {
    return (
      "No comparable vendor price information was found in Firebase."
    );
  }

  const vendorText =
    vendors.length === 1
      ? vendors[0]
      : vendors.slice(0, -1).join(", ") +
        " and " +
        vendors[vendors.length - 1];

  const averagePrice =
    money(
      cheapest?.averagePrice ??
        cheapest?.price
    );

  const isTie =
    cheapest?.priceTie === true ||
    vendors.length > 1;

  if (isTie) {
    return (
      `Vendor Price Result\n\n` +
      `Vendors : ${vendorText}\n\n` +
      `Average Price : ${averagePrice}\n\n` +
      `Result : Price Tie\n\n` +
      `${vendorText} have the same average unit price based on the comparable priced quote lines.`
    );
  }

  return (
    `Vendor Price Result\n\n` +
    `Vendor : ${vendorText}\n\n` +
    `Average Price : ${averagePrice}\n\n` +
    `Result : Lowest Average Unit Price\n\n` +
    `${vendorText} has the lowest average unit price based on the comparable priced quote lines.`
  );
}

function formatMultiCriteria(
  data: any
): string {
  const price =
    data?.price;

  const rating =
    data?.rating;

  let output =
    "Vendor Multi-Criteria Result\n\n";

  output +=
    "Criteria Used : Price and Rating\n\n";

  // ----------------------------------------------------------
  // PRICE
  // ----------------------------------------------------------

  if (
    price?.cheapestVendor
  ) {
    const cheapest =
      price.cheapestVendor;

    const vendors =
      Array.isArray(
        cheapest?.vendors
      )
        ? cheapest.vendors
        : clean(
            cheapest?.vendor
          )
            .split(",")
            .map(
              (v: string) =>
                v.trim()
            )
            .filter(Boolean);

    const vendorText =
      vendors.length === 1
        ? vendors[0]
        : vendors.join(" and ");

    output +=
      `Price Result : ${vendorText}\n`;

    output +=
      `Average Unit Price : ${money(
        cheapest?.averagePrice ??
          cheapest?.price
      )}\n\n`;
  } else {
    output +=
      "Price Result : Not Available\n\n";
  }

  // ----------------------------------------------------------
  // RATING
  // ----------------------------------------------------------

  if (
    rating?.highestRating !==
      undefined &&
    Array.isArray(
      rating?.highestRatedVendors
    )
  ) {
    const vendorText =
      rating.highestRatedVendors.length ===
      1
        ? rating.highestRatedVendors[0]
        : rating.highestRatedVendors.join(
            " and "
          );

    output +=
      `Rating Result : ${vendorText}\n`;

    output +=
      `Highest Rating : ${rating.highestRating}\n\n`;
  } else {
    output +=
      "Rating Result : Not Available\n\n";
  }

  // ----------------------------------------------------------
  // IMPORTANT
  // ----------------------------------------------------------

  output +=
    "Overall Result : Not determined from arbitrary weights.\n\n";

  output +=
    "Price and rating were evaluated separately because no business weighting rule was provided.";

  return output;
}

export function formatVendorComparison(
  data: any,
  question?: string
): string {
  // ----------------------------------------------------------
  // NEW OBJECT FORMAT
  // ----------------------------------------------------------

  if (
    data &&
    !Array.isArray(data) &&
    data.type === "MULTI_CRITERIA"
  ) {
    return formatMultiCriteria(
      data
    );
  }

  if (
    data &&
    !Array.isArray(data) &&
    data.type === "RATING"
  ) {
    return formatRatingComparison(
      data
    );
  }

  // ----------------------------------------------------------
  // OLD PRICE COMPARISON FORMAT
  // ----------------------------------------------------------

  if (
    data &&
    !Array.isArray(data) &&
    data.cheapestVendor
  ) {
    return formatPriceComparison(
      data
    );
  }

  // ----------------------------------------------------------
  // ARRAY WRAPPER
  // ----------------------------------------------------------

  if (
    Array.isArray(data)
  ) {
    if (
      data.length === 0
    ) {
      return (
        "No comparable vendor information was found in Firebase."
      );
    }

    const first =
      data[0];

    if (
      first?.type === "RATING"
    ) {
      return formatRatingComparison(
        first
      );
    }

    if (
      first?.type === "MULTI_CRITERIA"
    ) {
      return formatMultiCriteria(
        first
      );
    }

    const priceResult =
      data.find(
        (item: any) =>
          item?.cheapestVendor
      );

    if (
      priceResult
    ) {
      return formatPriceComparison(
        priceResult
      );
    }
  }

  return (
    "No comparable vendor information was found in Firebase."
  );
}