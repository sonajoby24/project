import { adminDb } from "@/lib/firebase-admin";

export async function retrieveVendors(
  plan: any
) {
  const data: any = {
    vendors: [],
  };

  const snapshot = await adminDb
    .collection("vendor")
    .get();

  const vendors = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // -----------------------------------------
  // SHOW ALL VENDORS
  // -----------------------------------------

  if (plan.intent === "SHOW_ALL_VENDORS") {
    data.vendors = vendors;
    return data;
  }

  // -----------------------------------------
  // VENDOR ENTITY FROM PLANNER
  // -----------------------------------------

  const entity = String(
    plan.entities?.vendor || ""
  )
    .trim()
    .toLowerCase();

  console.log(
    "SEARCH VENDOR ENTITY:",
    entity
  );

  if (!entity) {
    return data;
  }

  // -----------------------------------------
  // SEARCH VENDOR
  // -----------------------------------------

  const results = vendors.filter(
    (vendor: any) => {

      const vendorName =
        String(
          vendor.Vendor ||
          vendor.vendorName ||
          vendor.Name ||
          ""
        ).toLowerCase();

      return vendorName.includes(entity);
    }
  );

  const uniqueResults =
    Array.from(
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