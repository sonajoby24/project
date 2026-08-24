import { adminDb } from "@/lib/firebase-admin";

import { procurementIndex } from "../vector/pinecone";

import { createEmbedding } from "../embeddings/embedding";

import { buildVendorDocument } from "./documentBuilder";

export async function syncVendors() {

    console.log("Indexing Vendors...");

    const snapshot =
        await adminDb.collection("vendor").get();

    for (const doc of snapshot.docs) {

       const vendor: any = {

    id: doc.id,

    ...(doc.data() as any)

};

        const vectorDoc =
            buildVendorDocument(vendor);

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

    console.log("Vendor Index Complete");

}