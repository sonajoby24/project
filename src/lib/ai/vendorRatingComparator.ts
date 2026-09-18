// ============================================================
// VENDOR RATING COMPARATOR
// ============================================================

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

  const parsed =
    Number(
      String(value)
        .replace(/[^0-9.-]/g, "")
    );

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function getVendorName(
  vendor: any
): string {
  return clean(
    vendor?.VendorName ??
      vendor?.vendorName ??
      vendor?.Vendor ??
      vendor?.vendor ??
      vendor?.Name ??
      vendor?.name
  );
}

function getRating(
  vendor: any
): number | null {
  return numberValue(
    vendor?.Rating ??
      vendor?.rating ??
      vendor?.VendorRating ??
      vendor?.vendorRating ??
      vendor?.Score ??
      vendor?.score
  );
}

export function compareVendorRatings(
  vendors: any[]
) {
  const safeVendors =
    Array.isArray(vendors)
      ? vendors
      : [];

  const records = safeVendors
    .map((vendor: any) => ({
      vendor: getVendorName(vendor),
      rating: getRating(vendor),
    }))
    .filter(
      (record) =>
        record.vendor &&
        record.rating !== null
    );

  console.log(
    "RATING COMPARISON RECORDS:",
    JSON.stringify(
      records,
      null,
      2
    )
  );

  if (
    records.length === 0
  ) {
    return {
      type: "RATING",
      vendors: [],
      highestRatedVendor: null,
      ratingTie: false,
      message:
        "No vendor rating information was found in Firebase.",
    };
  }

  const highestRating =
    Math.max(
      ...records.map(
        (record) =>
          record.rating as number
      )
    );

  const highestRated =
    records.filter(
      (record) =>
        Math.abs(
          (record.rating as number) -
            highestRating
        ) < 0.000001
    );

  const highestRatedVendors =
    highestRated.map(
      (record) =>
        record.vendor
    );

  return {
    type: "RATING",

    vendors: records,

    highestRating,

    highestRatedVendor:
      highestRatedVendors.join(
        ", "
      ),

    highestRatedVendors,

    ratingTie:
      highestRated.length > 1,

    count:
      records.length,
  };
}