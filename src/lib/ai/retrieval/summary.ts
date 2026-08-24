import { adminDb } from "@/lib/firebase-admin";

export async function retrieveSummary(query: string) {

  const lowerQuery = query.toLowerCase();

  if (
    !lowerQuery.includes("summary") &&
    !lowerQuery.includes("overview")
  ) {

    return {};

  }

  const quoteSnapshot =
    await adminDb
      .collection("quotes")
      .get();

  const vendorSnapshot =
    await adminDb
      .collection("vendor")
      .get();

  const productSnapshot =
    await adminDb
      .collection("products")
      .get();

  const orderSnapshot =
    await adminDb
      .collection("orders")
      .get();

  return {

    summary: {

      totalQuotes:
        quoteSnapshot.size,

      totalVendors:
        vendorSnapshot.size,

      totalProducts:
        productSnapshot.size,

      totalOrders:
        orderSnapshot.size,

    }

  };

}