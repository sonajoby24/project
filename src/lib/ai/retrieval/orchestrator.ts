import { retrieveFromVector } from "./vectorRetriever";
import { retrieveFirestoreDocuments } from "./firestoreRetriever";

import { compareVendorQuotes } from "../vendorComparator";
import { compareVendorRatings } from "../vendorRatingComparator";

import { retrieveProducts } from "./product";
import { retrieveQuotes } from "./quote";
import { retrieveVendors } from "./vendor";
import { retrieveOrders } from "./order";
import { retrieveQuoteLineProducts } from "./quoteLine";
import { retrieveSummary } from "./summary";

// ============================================================
// GET PRODUCT NAME
// ============================================================

function getProductName(plan: any): string {
  const entities = plan?.entities;

  if (!entities) {
    return "";
  }

  if (typeof entities.product === "string") {
    return entities.product.trim();
  }

  if (entities.product?.name) {
    return String(entities.product.name).trim();
  }

  if (entities.product?.entityName) {
    return String(entities.product.entityName).trim();
  }

  if (Array.isArray(entities)) {
    const productEntity = entities.find(
      (entity: any) =>
        String(entity?.type || "").toLowerCase() ===
        "product"
    );

    if (productEntity) {
      return String(
        productEntity.name ||
          productEntity.entityName ||
          productEntity.value ||
          ""
      ).trim();
    }
  }

  return "";
}

// ============================================================
// GET VENDOR NAME
// ============================================================

function getVendorName(plan: any): string {
  const entities = plan?.entities;

  if (!entities) {
    return "";
  }

  if (typeof entities.vendor === "string") {
    return entities.vendor.trim();
  }

  if (entities.vendor?.name) {
    return String(entities.vendor.name).trim();
  }

  if (entities.vendor?.entityName) {
    return String(entities.vendor.entityName).trim();
  }

  if (Array.isArray(entities)) {
    const vendorEntity = entities.find(
      (entity: any) =>
        String(entity?.type || "").toLowerCase() ===
        "vendor"
    );

    if (vendorEntity) {
      return String(
        vendorEntity.name ||
          vendorEntity.entityName ||
          vendorEntity.value ||
          ""
      ).trim();
    }
  }

  return "";
}

// ============================================================
// NORMALIZE FIELD
// ============================================================

function normalizeField(value: any): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase();
}

// ============================================================
// CHECK FIELD
// ============================================================

function hasField(
  fields: string[],
  ...names: string[]
): boolean {
  const normalized = fields.map(normalizeField);

  return names.some((name) =>
    normalized.includes(normalizeField(name))
  );
}

// ============================================================
// MAIN RETRIEVAL ORCHESTRATOR
// ============================================================

export async function executeRetrievalPlan(
  query: string,
  plan: any
) {
  console.log("=================================");
  console.log("RETRIEVAL ORCHESTRATOR");
  console.log("=================================");

  console.log("QUERY:", query);
  console.log("INTENT:", plan?.intent);

  console.log(
    "ENTITIES:",
    JSON.stringify(
      plan?.entities,
      null,
      2
    )
  );

  const productName =
    getProductName(plan);

  const vendorName =
    getVendorName(plan);

  const fields = Array.isArray(plan?.fields)
    ? plan.fields.map((field: any) =>
        String(field)
      )
    : [];

  const wantsRating =
    hasField(fields, "Rating");

  const wantsPrice =
    hasField(
      fields,
      "UnitPrice",
      "Price"
    );

  const wantsMultiCriteria =
    wantsRating && wantsPrice;

  console.log(
    "EXTRACTED PRODUCT:",
    productName
  );

  console.log(
    "EXTRACTED VENDOR:",
    vendorName
  );

  console.log(
    "COMPARISON FIELDS:",
    fields
  );

  console.log(
    "WANTS RATING:",
    wantsRating
  );

  console.log(
    "WANTS PRICE:",
    wantsPrice
  );

  // ============================================================
  // COMBINED EVIDENCE
  // ============================================================

  const combinedEvidence: any = {
    intent:
      plan?.intent || "UNKNOWN",

    entities:
      plan?.entities || {},

    products: [],
    vendors: [],
    quotes: [],
    orders: [],
    reports: [],
    quoteLines: [],

    comparison: [],

    procurement: undefined,
  };

  // ============================================================
  // EXECUTE RETRIEVAL PLAN
  // ============================================================

  for (
    const step of
      plan?.retrievalPlan ?? []
  ) {
    console.log(
      "Executing retrieval step:",
      JSON.stringify(
        step,
        null,
        2
      )
    );

    // ==========================================================
    // VECTOR
    // ==========================================================

    if (
      step.source === "pinecone"
    ) {
      const vectorMatches =
        await retrieveFromVector(
          query,
          step.collection,
          step.topK ?? 10,
          step.filter
        );

      const firestoreEvidence =
        await retrieveFirestoreDocuments(
          vectorMatches
        );

      combinedEvidence.products.push(
        ...(firestoreEvidence.products ?? [])
      );

      combinedEvidence.vendors.push(
        ...(firestoreEvidence.vendors ?? [])
      );

      combinedEvidence.quotes.push(
        ...(firestoreEvidence.quotes ?? [])
      );

      combinedEvidence.orders.push(
        ...(firestoreEvidence.orders ?? [])
      );

      combinedEvidence.quoteLines.push(
        ...(firestoreEvidence.quoteLines ?? [])
      );

      continue;
    }

    if (
      step.source !== "firestore"
    ) {
      continue;
    }

    // ==========================================================
    // PRODUCT
    // ==========================================================

    switch (step.collection) {
      case "Product": {
        const normalizedFields =
          fields.map(normalizeField);

        const needsQuoteLine =
          normalizedFields.includes(
            "specification"
          ) ||
          normalizedFields.includes(
            "specvalue"
          ) ||
          normalizedFields.includes(
            "price"
          ) ||
          normalizedFields.includes(
            "unitprice"
          ) ||
          normalizedFields.includes(
            "quantity"
          ) ||
          normalizedFields.includes(
            "targetprice"
          ) ||
          normalizedFields.includes(
            "target price"
          );

        if (needsQuoteLine) {
          console.log(
            "PRODUCT FIELD REQUIRES QUOTELINE:",
            fields
          );

          const quoteLineFields =
            plan?.intent ===
              "COMPARE_VENDORS"
              ? [
                  "UnitPrice",
                  "Specification",
                  "Quantity",
                ]
              : fields;

          const quoteLineData =
            await retrieveQuoteLineProducts(
              productName,
              quoteLineFields,
              plan?.intent
            );

          combinedEvidence.quoteLines.push(
            ...(quoteLineData.products ?? [])
          );

          break;
        }

        const products =
          await retrieveProducts(
            query,
            plan?.entities,
            plan?.intent
          );

        combinedEvidence.products.push(
          ...(products ?? [])
        );

        break;
      }

      // ========================================================
      // VENDOR
      // ========================================================

      case "Vendor": {
        const vendorData =
          await retrieveVendors(
            plan
          );

        combinedEvidence.vendors.push(
          ...(vendorData.vendors ?? [])
        );

        break;
      }

      // ========================================================
      // QUOTE
      // ========================================================

      case "Quote": {
        const quoteData =
          await retrieveQuotes(
            plan
          );

        combinedEvidence.quotes.push(
          ...(quoteData.quotes ?? [])
        );

        break;
      }

      // ========================================================
      // QUOTE LINE
      // ========================================================

      case "QuoteLine": {
        console.log(
          "QUOTE LINE PRODUCT:",
          productName
        );

        const quoteLineFields =
          plan?.intent ===
            "COMPARE_VENDORS" &&
          productName
            ? [
                "UnitPrice",
                "Specification",
                "Quantity",
              ]
            : fields;

        const quoteLineData =
          await retrieveQuoteLineProducts(
            productName,
            quoteLineFields,
            plan?.intent
          );

        combinedEvidence.quoteLines.push(
          ...(quoteLineData.products ?? [])
        );

        break;
      }

      // ========================================================
      // ORDER
      // ========================================================

      case "Order": {
        const orderData =
          await retrieveOrders(
            plan
          );

        combinedEvidence.orders.push(
          ...(orderData.orders ?? [])
        );

        break;
      }

      // ========================================================
      // REPORT
      // ========================================================

      case "Report": {
        const reportData =
          await retrieveSummary(
            query
          );

        Object.assign(
          combinedEvidence,
          reportData
        );

        break;
      }

      default: {
        console.warn(
          "Unknown retrieval collection:",
          step.collection
        );

        break;
      }
    }
  }

  // ============================================================
  // VENDOR COMPARISON
  // ============================================================

  if (
    plan?.intent ===
    "COMPARE_VENDORS"
  ) {
    console.log(
      "================================="
    );

    console.log(
      "BUILDING VENDOR COMPARISON"
    );

    console.log(
      "PRODUCT:",
      productName
    );

    console.log(
      "FIELDS:",
      fields
    );

    // ----------------------------------------------------------
    // RATING ONLY
    // ----------------------------------------------------------

    if (
      wantsRating &&
      !wantsPrice
    ) {
      console.log(
        "RATING COMPARISON"
      );

      combinedEvidence.comparison =
        compareVendorRatings(
          combinedEvidence.vendors
        );
    }

    // ----------------------------------------------------------
    // PRICE ONLY
    // ----------------------------------------------------------

    else if (
      wantsPrice &&
      !wantsRating
    ) {
      console.log(
        "PRICE COMPARISON"
      );

      if (
        combinedEvidence.quoteLines.length > 0
      ) {
        combinedEvidence.comparison =
          compareVendorQuotes(
            combinedEvidence.quoteLines
          );
      }
    }

    // ----------------------------------------------------------
    // MULTI CRITERIA
    // ----------------------------------------------------------

    else if (
      wantsMultiCriteria
    ) {
      console.log(
        "MULTI-CRITERIA COMPARISON"
      );

      const priceComparison =
        combinedEvidence.quoteLines.length > 0
          ? compareVendorQuotes(
              combinedEvidence.quoteLines
            )
          : null;

      const ratingComparison =
        combinedEvidence.vendors.length > 0
          ? compareVendorRatings(
              combinedEvidence.vendors
            )
          : null;

      combinedEvidence.comparison = {
        type: "MULTI_CRITERIA",

        price:
          priceComparison,

        rating:
          ratingComparison,
      };
    }

    console.log(
      "VENDOR COMPARISON:",
      JSON.stringify(
        combinedEvidence.comparison,
        null,
        2
      )
    );

    console.log(
      "================================="
    );
  }

  // ============================================================
  // DEDUPLICATE PRODUCTS
  // ============================================================

  combinedEvidence.products =
    Array.from(
      new Map(
        combinedEvidence.products.map(
          (product: any) => [
            product.id ||
              product.productId ||
              product.name,

            product,
          ]
        )
      ).values()
    );

  // ============================================================
  // DEDUPLICATE VENDORS
  // ============================================================

  combinedEvidence.vendors =
    Array.from(
      new Map(
        combinedEvidence.vendors.map(
          (vendor: any) => [
            vendor.id ||
              vendor.Vendor ||
              vendor.vendorName ||
              vendor.Name,

            vendor,
          ]
        )
      ).values()
    );

  // ============================================================
  // DEDUPLICATE QUOTES
  // ============================================================

  const uniqueQuotes =
    new Map<string, any>();

  for (
    const quote of
      combinedEvidence.quotes
  ) {
    const key =
      String(
        quote?.id ||
          quote?.QuoteId ||
          quote?.QuoteInfo?.[0]?.QuoteId ||
          quote?.QuoteNumber ||
          ""
      ).trim();

    if (key) {
      uniqueQuotes.set(
        key,
        quote
      );
    }
  }

  combinedEvidence.quotes =
    Array.from(
      uniqueQuotes.values()
    );

  // ============================================================
  // DEDUPLICATE QUOTE LINES
  // ============================================================

  const uniqueQuoteLines =
    new Map<string, any>();

  for (
    const line of
      combinedEvidence.quoteLines
  ) {
    const key = [
      line?.VendorName ||
        line?.vendor ||
        "",

      line?.ProductName ||
        line?.product ||
        "",

      line?.specValue ||
        line?.Specification ||
        "",

      line?.UnitPrice ??
        line?.unitPrice ??
        line?.Price ??
        "",

      line?.quoteNumber ||
        line?.QuoteNumber ||
        "",
    ]
      .map(normalizeField)
      .join("|");

    uniqueQuoteLines.set(
      key,
      line
    );
  }

  combinedEvidence.quoteLines =
    Array.from(
      uniqueQuoteLines.values()
    );

  console.log(
    "================================="
  );

  console.log(
    "FINAL RETRIEVAL COUNTS"
  );

  console.log(
    "Products:",
    combinedEvidence.products.length
  );

  console.log(
    "Vendors:",
    combinedEvidence.vendors.length
  );

  console.log(
    "Quotes:",
    combinedEvidence.quotes.length
  );

  console.log(
    "Orders:",
    combinedEvidence.orders.length
  );

  console.log(
    "Quote Lines:",
    combinedEvidence.quoteLines.length
  );

  console.log(
    "================================="
  );

  return combinedEvidence;
}