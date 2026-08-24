import { Evidence } from "./types/evidence";

export function buildEvidence(data: any): Evidence {

  return {

    intent: data.intent,

    entities: data.entities,

    products: data.products ?? [],

    vendors: data.vendors ?? [],

    quotes: data.quotes ?? [],

    orders: data.orders ?? [],

    reports: data.reports ?? [],

    quoteLines: data.quoteLines ?? [],

    comparison: data.comparison ?? [],

    procurement: data.procurement,

    metadata: {

      retrievedAt: new Date().toISOString(),

      sources: [

        "Firestore",

        "Pinecone"

      ],

      confidence: data.confidence ?? 1,

      totalRecords:
  (data.products?.length ?? 0) +
  (data.vendors?.length ?? 0) +
  (data.quotes?.length ?? 0) +
  (data.orders?.length ?? 0) +
  (data.quoteLines?.length ?? 0) +
  (data.reports?.length ?? 0) +
  (data.comparison?.length ?? 0)

    }

  };

}