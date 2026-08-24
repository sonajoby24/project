import { adminDb } from "@/lib/firebase-admin";

export async function retrieveVendors(
  query: string,
  nlu: any
) {
  const data: any = {};

  const snapshot = await adminDb
    .collection("vendor")
    .get();

  const vendors = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // -------------------------
  // Show all vendors
  // -------------------------

  if (nlu.intent === "SHOW_ALL_VENDORS") {
    data.vendors = vendors;
    return data;
  }

  // -------------------------
  // Search using NLU entity
  // -------------------------

 const entity =
(nlu.entities?.vendor || "").toLowerCase();

  if (!entity) {
    return data;
  }

  const results = vendors.filter((vendor: any) => {

  const vendorName =
    String(
      vendor.Vendor ||
      vendor.vendorName ||
      vendor.Name ||
      ""
    ).toLowerCase();

  return vendorName.includes(entity);

});
const uniqueResults = Array.from(
  new Map(
    results.map((vendor: any) => [
      vendor.id,
      vendor,
    ])
  ).values()
);

data.vendors = uniqueResults;

return data;

}