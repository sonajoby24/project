import { adminDb } from "@/lib/firebase-admin";

const STOP_WORDS = [
  "show",
  "list",
  "find",
  "search",
  "details",
  "detail",
  "of",
  "the",
  "product",
  "products",
  "from",
  "vendor",
  "about",
  "for",
  "all"
];

export async function retrieveProducts(query: string, nlu: any) {

  const snapshot = await adminDb
    .collection("products")
    .get();

  const products = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Show all products

  if (
    query.toLowerCase().includes("show all products") ||
    query.toLowerCase().includes("list all products")
  ) {

    return products;

  }

  // Build search tokens

  const entity =
  (nlu.product || nlu.entityName || "").toLowerCase();

console.log("SEARCH ENTITY:", entity);

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

      product.status

    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let score = 0;

    if (
  entity &&
  searchable.includes(entity)
) {
  score = 100;
}

    return {

      ...product,

      score

    };

  });

  return scored
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);

}