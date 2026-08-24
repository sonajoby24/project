import { adminDb } from "@/lib/firebase-admin";

import { procurementIndex } from "../vector/pinecone";

import { createEmbedding } from "../embeddings/embedding";

import { buildQuoteLineDocument } from "./documentBuilder";

export async function syncQuotes() {

    console.log("Indexing Quotes...");

    const snapshot =
        await adminDb.collection("quotes").get();

    for (const doc of snapshot.docs) {

       const quote: any = {

    id: doc.id,

    ...(doc.data() as any)

};

        const lines =
            quote.QuoteInfo?.[0]?.Qlines || [];

        for (const line of lines) {

            const vectorDoc =
                buildQuoteLineDocument(
                    quote,
                    line
                );

            const embedding =
                await createEmbedding(
                    vectorDoc.text
                );

          await procurementIndex.upsert({

    records: [

        {

            id: vectorDoc.id,

            values: embedding,

            metadata: {

                ...vectorDoc.metadata,

                text: vectorDoc.text

            }

        }

    ]

});

        }

    }

    console.log("Quote Index Complete");

}