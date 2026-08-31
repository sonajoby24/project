import { adminDb } from "@/lib/firebase-admin";

export async function retrieveProducts(
  query: string,
  entities: any,
  intent?: string
) {
  const snapshot = await adminDb
    .collection("products")
    .get();

  const products = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // -----------------------------------------
  // SHOW ALL PRODUCTS
  // -----------------------------------------

  if (intent === "SHOW_ALL_PRODUCTS") {
    return products;
  }

  // -----------------------------------------
  // PRODUCT ENTITY FROM NLU / PLANNER
  // -----------------------------------------

  const entity = String(
    entities?.product || ""
  )
    .trim()
    .toLowerCase();

  console.log("SEARCH PRODUCT ENTITY:", entity);

  if (!entity) {
    return [];
  }

  // -----------------------------------------
  // SEARCH PRODUCT RECORDS
  // -----------------------------------------

  const scored = products.map((product: any) => {
    const searchable = [
      product.productId,
      product.name,
      product.brand,
      product.category,
      product["part name"],
      product["part id"],
      product.Vendor,
      product.Colour,
      product.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let score = 0;

    if (searchable.includes(entity)) {
      score = 100;
    }

    return {
      ...product,
      score,
    };
  });

  return scored
    .filter((product) => product.score > 0)
    .sort((a, b) => b.score - a.score);
}