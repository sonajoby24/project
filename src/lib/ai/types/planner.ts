export interface RetrievalPlan {

  goal: string;

  intent: string;

  reasoning:
    | "LOOKUP"
    | "COMPARE"
    | "ANALYZE"
    | "REPORT"
    | "RECOMMEND";

  entities: {

    product?: string;

    vendor?: string;

    quote?: string;

    order?: string;

    report?: string;

  };

  collections: string[];

  filters: {
  field: string;
  operator: "==" | "contains" | ">" | "<";
  value: string;
}[];

projection: string[];

sort?: {
  field: string;
  direction: "asc" | "desc";
};

limit?: number;

  semanticSearch: boolean;

  requiresComparison: boolean;

  requiresReasoning: boolean;

  outputFormat:
    | "TABLE"
    | "LIST"
    | "SUMMARY";

  confidence: number;

  retrievalPlan: {

    source:
      | "pinecone"
      | "firestore";

    collection: string;

    operation: string;

    topK?: number;

    filter?: {

      type?: string;

      quoteType?: string;

    };

  }[];

}