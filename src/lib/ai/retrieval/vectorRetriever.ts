import { createEmbedding } from "../embeddings/embedding";
import { procurementIndex } from "../vector/pinecone";

export interface VectorResult {

  score: number;

  firestoreId: string;

  collection: string;

  metadata: any;

}

export async function retrieveFromVector(

  query: string,

  collection: string,

  topK: number = 10,

  filter?: any

): Promise<VectorResult[]> {

  console.log("=================================");
  console.log("VECTOR SEARCH");
  console.log("Collection:", collection);
  console.log("TopK:", topK);
  console.log("Filter:", filter);
  console.log("=================================");

  const embedding =
    await createEmbedding(query);

  const response =
    await procurementIndex.query({

      vector: embedding,

      topK,

      includeMetadata: true,

      filter

    });

  if (!response.matches) {

    return [];

  }

  return response.matches.map((match: any) => ({

    score: match.score ?? 0,

    firestoreId:
      String(match.metadata?.firestoreId ?? ""),

    collection:
      String(match.metadata?.type ?? ""),

    metadata:
      match.metadata ?? {}

  }));

}