import { retrieveFromVector } from "./vectorRetriever";
import { retrieveFirestoreDocuments } from "./firestoreRetriever";
import { retrieveFromFirestore } from "./index";

export async function executeRetrievalPlan(
  query: string,
  plan: any
) {

  console.log("=================================");
  console.log("RETRIEVAL ORCHESTRATOR");
  console.log("=================================");

  let combinedEvidence: any = {
    products: [],
    vendors: [],
    quotes: [],
    orders: [],
    reports: [],
    quoteLines: [],
    comparison: []
  };

  for (const step of plan.retrievalPlan) {

    console.log("Executing:", step);

    // Semantic Retrieval
    if (step.source === "pinecone") {

     const vectorMatches =
    await retrieveFromVector(

        query,

        step.collection,

        step.topK ?? 10,

        step.filter

    );

      const firestoreEvidence =
        await retrieveFirestoreDocuments(vectorMatches);

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

    }

    // Structured Retrieval
    if (step.source === "firestore") {

      const firestoreData =
    await retrieveFromFirestore(
        query,
        plan
    );

      combinedEvidence.products.push(
        ...(firestoreData.products ?? [])
      );

      combinedEvidence.vendors.push(
        ...(firestoreData.vendors ?? [])
      );

      combinedEvidence.quotes.push(
        ...(firestoreData.quotes ?? [])
      );

      combinedEvidence.orders.push(
        ...(firestoreData.orders ?? [])
      );

     combinedEvidence.quoteLines.push(
  ...(firestoreData.quoteLines ?? [])
);

      combinedEvidence.comparison =
        firestoreData.comparison ?? [];

      combinedEvidence.procurement =
        firestoreData.procurement;

      combinedEvidence.intent =
        firestoreData.intent;

      combinedEvidence.entities =
        firestoreData.entities;

    }

  }

  return combinedEvidence;

}