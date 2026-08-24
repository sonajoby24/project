import { adminDb } from "@/lib/firebase-admin";

import { procurementIndex } from "../vector/pinecone";

import { createEmbedding } from "../embeddings/embedding";

import { buildProductDocument } from "./documentBuilder";

export async function syncProducts() {

    console.log("Indexing Products...");

    const snapshot =
        await adminDb.collection("products").get();

    for (const doc of snapshot.docs) {

       const product: any = {

    id: doc.id,

    ...(doc.data() as any)

};

        const vectorDoc =
            buildProductDocument(product);

        const embedding =
            await createEmbedding(vectorDoc.text);

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

    console.log("Products Indexed");

}