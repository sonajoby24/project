export interface Evidence {

  intent?: string;

  entities?: any;

  products: any[];

  vendors: any[];

  quotes: any[];

  orders: any[];

  reports?: any[];

  quoteLines?: any[];

  comparison?: any[];

  procurement?: any;

  metadata: {

    retrievedAt: string;

    sources: string[];

    confidence: number;

    totalRecords: number;

  };

}