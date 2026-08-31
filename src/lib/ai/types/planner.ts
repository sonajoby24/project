export interface RetrievalPlan {

  goal: string;

  intent:
    | "PRODUCT_SEARCH"
    | "VENDOR_SEARCH"
    | "QUOTE_SEARCH"
    | "ORDER_SEARCH"
    | "COMPARE_VENDORS"
    | "PROCUREMENT_ANALYSIS"
    | "SHOW_ALL_PRODUCTS"
    | "SHOW_ALL_VENDORS"
    | "SHOW_ALL_QUOTES"
    | "SHOW_ALL_ORDERS"
    | "REPORT"
    | "UNKNOWN";

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

  fields: string[];

  filters?: {

    field: string;

    operator:
      | "=="
      | "contains"
      | ">"
      | "<";

    value: string;

  }[];

  projection?: string[];

  sort?: {

    field: string;

    direction:
      | "asc"
      | "desc";

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

    collection:
      | "Product"
      | "Vendor"
      | "Quote"
      | "QuoteLine"
      | "Order"
      | "Report";

    operation: string;

    topK?: number;

    filter?: {

      type?: string;

      quoteType?: string;

    };

  }[];

}