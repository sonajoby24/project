import { adminDb } from "@/lib/firebase-admin";

// ============================================================
// NORMALIZE TEXT
// ============================================================

function normalizeText(value: any): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// ============================================================
// EXTRACT PRODUCT ENTITY
// ============================================================

function getProductEntity(entities: any): string {
  if (!entities) {
    return "";
  }

  // ----------------------------------------------------------
  // entities.product is a string
  // ----------------------------------------------------------

  if (
    typeof entities.product === "string"
  ) {
    return normalizeText(
      entities.product
    );
  }

  // ----------------------------------------------------------
  // entities.product is an object
  // ----------------------------------------------------------

  if (
    entities.product &&
    typeof entities.product === "object"
  ) {
    return normalizeText(
      entities.product.name ??
        entities.product.entityName ??
        entities.product.value ??
        entities.product.productName ??
        ""
    );
  }

  // ----------------------------------------------------------
  // entities itself is an array
  // ----------------------------------------------------------

  if (Array.isArray(entities)) {
    const productEntity =
      entities.find(
        (entity: any) =>
          normalizeText(
            entity?.type
          ) === "product"
      );

    if (productEntity) {
      return normalizeText(
        productEntity.name ??
          productEntity.entityName ??
          productEntity.value ??
          productEntity.productName ??
          ""
      );
    }
  }

  return "";
}

// ============================================================
// GET FIELD VALUE
// ============================================================

function firstValue(
  product: any,
  fields: string[]
): any {
  for (const field of fields) {
    if (
      product?.[field] !== undefined &&
      product?.[field] !== null &&
      String(
        product[field]
      ).trim() !== ""
    ) {
      return product[field];
    }
  }

  return undefined;
}

// ============================================================
// RETRIEVE PRODUCTS
// ============================================================

export async function retrieveProducts(
  query: string,
  entities: any,
  intent?: string
) {
  console.log(
    "================================="
  );

  console.log(
    "PRODUCT RETRIEVER"
  );

  console.log(
    "QUERY:",
    query
  );

  console.log(
    "INTENT:",
    intent
  );

  console.log(
    "ENTITIES:",
    JSON.stringify(
      entities,
      null,
      2
    )
  );

  console.log(
    "================================="
  );

  // ============================================================
  // FIRESTORE
  // ============================================================

  const snapshot = await adminDb
    .collection("products")
    .get();

  const products =
    snapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      })
    );

  console.log(
    "TOTAL PRODUCTS IN FIRESTORE:",
    products.length
  );

  // ============================================================
  // SHOW ALL PRODUCTS
  // ============================================================

  if (
    intent ===
    "SHOW_ALL_PRODUCTS"
  ) {
    console.log(
      "SHOWING ALL PRODUCTS:",
      products.length
    );

    return products;
  }

  // ============================================================
  // PRODUCT ENTITY
  // ============================================================

  let entity =
    getProductEntity(
      entities
    );

  // ============================================================
  // FALLBACK TO QUERY
  //
  // This is useful if the planner does not provide
  // entities.product but the query clearly contains a
  // product name.
  // ============================================================

  if (!entity) {
    const normalizedQuery =
      normalizeText(query);

    console.log(
      "NO PRODUCT ENTITY FROM PLANNER."
    );

    console.log(
      "NORMALIZED QUERY:",
      normalizedQuery
    );

    // We don't blindly use the entire query as a product.
    // Instead, attempt matching against product names.
    const queryMatches =
      products.filter(
        (product: any) => {
          const productName =
            normalizeText(
              firstValue(
                product,
                [
                  "name",
                  "productName",
                  "ProductName",
                  "product name",
                ]
              )
            );

          return (
            productName &&
            normalizedQuery.includes(
              productName
            )
          );
        }
      );

    if (
      queryMatches.length > 0
    ) {
      console.log(
        "PRODUCTS FOUND FROM QUERY:",
        queryMatches.length
      );

      return queryMatches.map(
        (product: any) => ({
          ...product,
          score: 200,
        })
      );
    }
  }

  console.log(
    "SEARCH PRODUCT ENTITY:",
    entity
  );

  if (!entity) {
    console.log(
      "NO PRODUCT ENTITY FOUND."
    );

    return [];
  }

  // ============================================================
  // SCORE PRODUCTS
  // ============================================================

  const scored =
    products.map(
      (product: any) => {
        const productId =
          normalizeText(
            firstValue(
              product,
              [
                "productId",
                "ProductId",
                "ProductID",
                "productID",
              ]
            )
          );

        const productName =
          normalizeText(
            firstValue(
              product,
              [
                "name",
                "productName",
                "ProductName",
                "product name",
              ]
            )
          );

        const brand =
          normalizeText(
            firstValue(
              product,
              [
                "brand",
                "Brand",
              ]
            )
          );

        const category =
          normalizeText(
            firstValue(
              product,
              [
                "category",
                "Category",
              ]
            )
          );

        const partName =
          normalizeText(
            firstValue(
              product,
              [
                "part name",
                "partName",
                "PartName",
              ]
            )
          );

        const partId =
          normalizeText(
            firstValue(
              product,
              [
                "part id",
                "partId",
                "PartId",
                "PartID",
              ]
            )
          );

        const vendor =
          normalizeText(
            firstValue(
              product,
              [
                "Vendor",
                "vendor",
                "VendorName",
                "vendorName",
              ]
            )
          );

        const colour =
          normalizeText(
            firstValue(
              product,
              [
                "Colour",
                "Color",
                "colour",
                "color",
              ]
            )
          );

        const status =
          normalizeText(
            firstValue(
              product,
              [
                "status",
                "Status",
              ]
            )
          );

        const specification =
          normalizeText(
            firstValue(
              product,
              [
                "Specification",
                "specification",
                "SpecValue",
                "specValue",
                "Spec Value",
                "spec value",
              ]
            )
          );

        const searchableFields = [
          productId,
          productName,
          brand,
          category,
          partName,
          partId,
          vendor,
          colour,
          status,
          specification,
        ].filter(Boolean);

        const searchable =
          searchableFields.join(" ");

        let score = 0;

        // --------------------------------------------------------
        // EXACT PRODUCT NAME
        // --------------------------------------------------------

        if (
          productName === entity
        ) {
          score = 300;
        }

        // --------------------------------------------------------
        // PRODUCT NAME CONTAINS ENTITY
        // --------------------------------------------------------

        else if (
          productName.includes(
            entity
          )
        ) {
          score = 250;
        }

        // --------------------------------------------------------
        // PRODUCT ID EXACT MATCH
        // --------------------------------------------------------

        if (
          productId === entity
        ) {
          score = Math.max(
            score,
            300
          );
        }

        // --------------------------------------------------------
        // PART ID EXACT MATCH
        // --------------------------------------------------------

        if (
          partId === entity
        ) {
          score = Math.max(
            score,
            280
          );
        }

        // --------------------------------------------------------
        // OTHER PRODUCT DATA
        // --------------------------------------------------------

        if (
          searchable.includes(
            entity
          )
        ) {
          score = Math.max(
            score,
            100
          );
        }

        return {
          ...product,
          score,
        };
      }
    );

  // ============================================================
  // RETURN MATCHES
  // ============================================================

  const results =
    scored
      .filter(
        (product: any) =>
          product.score > 0
      )
      .sort(
        (a: any, b: any) =>
          b.score - a.score
      );

  console.log(
    "PRODUCT RETRIEVAL RESULTS:",
    results.length
  );

  // ============================================================
  // DEBUG MATCHES
  // ============================================================

  if (
    results.length > 0
  ) {
    console.log(
      "MATCHED PRODUCTS:",
      results.map(
        (product: any) => ({
          id: product.id,

          productId:
            product.productId ??
            product.ProductId ??
            product.ProductID,

          name:
            product.name ??
            product.productName ??
            product.ProductName,

          specification:
            product.Specification ??
            product.specification ??
            product.SpecValue ??
            product.specValue ??
            product["Spec Value"] ??
            product["spec value"],

          score:
            product.score,
        })
      )
    );
  } else {
    console.log(
      "NO PRODUCTS MATCHED ENTITY:",
      entity
    );
  }

  console.log(
    "================================="
  );

  return results;
}