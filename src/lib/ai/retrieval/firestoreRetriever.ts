import { adminDb } from "@/lib/firebase-admin";
import { VectorResult } from "./vectorRetriever";

export async function retrieveFirestoreDocuments(
  matches: VectorResult[]
) {

  const result: any = {
  products: [],
  vendors: [],
  quotes: [],
  orders: [],
  reports: [],
  quoteLines: [],
  comparison: []
};

  for (const match of matches) {

    try {

      switch (match.collection) {

        case "product": {

          const doc = await adminDb
            .collection("products")
            .doc(match.firestoreId)
            .get();

          if (doc.exists) {
            result.products.push({
              id: doc.id,
              ...doc.data()
            });
          }

          break;
        }

        case "vendor": {

          const doc = await adminDb
            .collection("vendor")
            .doc(match.firestoreId)
            .get();

          if (doc.exists) {
            result.vendors.push({
              id: doc.id,
              ...doc.data()
            });
          }

          break;
        }

        case "quoteLine": {

  const doc = await adminDb
    .collection("quotes")
    .doc(match.firestoreId)
    .get();

  if (doc.exists) {

    const quote: any = {
  id: doc.id,
  ...(doc.data() as any)
};

    result.quotes.push(quote);

    const lines =
      quote.QuoteInfo?.[0]?.Qlines ?? [];

    result.quoteLines.push(...lines);

  }

  break;
}

        case "order": {

          const doc = await adminDb
            .collection("orders")
            .doc(match.firestoreId)
            .get();

          if (doc.exists) {
            result.orders.push({
              id: doc.id,
              ...doc.data()
            });
          }

          break;
        }

      }

    } catch (err) {

      console.error(err);

    }

  }

  return result;

}
export async function fetchCollection(
  collection: string
) {

  const snapshot =
    await adminDb
      .collection(collection)
      .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as any)
  }));

}