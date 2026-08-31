import { retrieveFromVector } from "./vectorRetriever";
import { retrieveFirestoreDocuments } from "./firestoreRetriever";
import { compareVendorQuotes } from "../vendorComparator";  
import { retrieveProducts } from "./product";
import { retrieveQuotes } from "./quote";
import { retrieveVendors } from "./vendor";
import { retrieveOrders } from "./order";
import { retrieveQuoteLineProducts } from "./quoteLine";
import { retrieveSummary } from "./summary";


export async function executeRetrievalPlan(
  query: string,
  plan: any
) {

  console.log("=================================");
  console.log("RETRIEVAL ORCHESTRATOR");
  console.log("=================================");

  const combinedEvidence: any = {

    intent: plan.intent,

    entities: plan.entities,

    products: [],

    vendors: [],

    quotes: [],

    orders: [],

    reports: [],

    quoteLines: [],

    comparison: [],

    procurement: undefined

  };


  // ============================================================
  // EXECUTE PLANNER RETRIEVAL STEPS
  // ============================================================

  for (
    const step of
    plan.retrievalPlan ?? []
  ) {

    console.log(
      "Executing retrieval step:",
      JSON.stringify(step, null, 2)
    );


    // ==========================================================
    // PINECONE / SEMANTIC RETRIEVAL
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


    // ==========================================================
    // FIRESTORE RETRIEVAL
    // ==========================================================

    if (
      step.source === "firestore"
    ) {

      switch (step.collection) {


        // ======================================================
        // PRODUCT
        // ======================================================

        case "Product": {

  const products =
    await retrieveProducts(
      query,
      plan.entities,
      plan.intent
    );

  combinedEvidence.products.push(
    ...(products ?? [])
  );

  break;
}


        // ======================================================
        // VENDOR
        // ======================================================

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

        // ======================================================
        // QUOTE
        // ======================================================

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
        // ======================================================
        // QUOTE LINE
        // ======================================================

        case "QuoteLine": {
  const quoteLineData =
    await retrieveQuoteLineProducts(
      plan.entities?.product ?? "",
      plan.fields ?? [],
      plan.intent
    );

  combinedEvidence.quoteLines.push(
    ...(quoteLineData.products ?? [])
  );

  break;
}


        // ======================================================
        // ORDER
        // ======================================================

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


        // ======================================================
        // REPORT
        // ======================================================

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


        // ======================================================
        // UNKNOWN COLLECTION
        // ======================================================

        default:

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
  plan.intent === "COMPARE_VENDORS" &&
  combinedEvidence.quoteLines.length > 0
) {

  console.log(
    "================================="
  );

  console.log(
    "BUILDING VENDOR COMPARISON"
  );

 combinedEvidence.comparison =
  compareVendorQuotes(
    combinedEvidence.quoteLines
  );

  console.log(
    "VENDOR COMPARISON:"
  );

  console.log(
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

            product

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

            vendor

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
    combinedEvidence.quotes ?? []
  ) {

    const quoteInfo =
      quote?.QuoteInfo?.[0];


    const quoteId =
      quoteInfo?.QuoteId ||
      quote?.id;


    if (quoteId) {

      uniqueQuotes.set(
        String(quoteId),
        quote
      );

    }

  }


  combinedEvidence.quotes =
    Array.from(
      uniqueQuotes.values()
    );


  // ============================================================
  // DEDUPLICATE ORDERS
  // ============================================================

  combinedEvidence.orders =
    Array.from(
      new Map(
        combinedEvidence.orders.map(
          (order: any) => [

            order.id ||
            order.orderId,

            order

          ]
        )
      ).values()
    );


  // ============================================================
  // DEDUPLICATE QUOTE LINES
  // ============================================================

  combinedEvidence.quoteLines =
    Array.from(
      new Map(
        combinedEvidence.quoteLines.map(
          (line: any) => [

            `${line.quoteId || ""}|${line.ProductName || ""}|${line.UnitPrice || ""}`,

            line

          ]
        )
      ).values()
    );


  // ============================================================
  // FINAL RETRIEVAL LOGGING
  // ============================================================

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
    "Reports:",
    combinedEvidence.reports.length
  );


  console.log(
    "================================="
  );


  console.log(
    "FINAL RETRIEVAL EVIDENCE:"
  );


  console.log(
    JSON.stringify(
      combinedEvidence,
      null,
      2
    )
  );


  console.log(
    "================================="
  );


  return combinedEvidence;

}