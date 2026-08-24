import { adminDb } from "@/lib/firebase-admin";

export async function retrieveVendorComparison() {

  const snapshot = await adminDb
    .collection("vendor")
    .get();

  const comparison = snapshot.docs.map((doc) => {

    const vendor: any = doc.data();

    return {

      id: doc.id,

      vendorId:
        vendor.vendorId ||
        vendor.VendorId ||
        "",

      vendorName:
        vendor.Name ||
        vendor.Vendor ||
        vendor.vendorName ||
        "",

      accountId:
        vendor.AccountId ||
        "",

      email:
        vendor.Email ||
        "",

      phone:
        vendor.Phone ||
        "",

      status:
        vendor.Status ||
        "",

      rating:
        vendor.rating ??
        null,

      deliveryDays:
        vendor.deliveryDays ??
        null,

      totalOrders:
        vendor.totalOrders ??
        null,

      city:
        vendor.city ||
        "",

      country:
        vendor.country ||
        "",

      raw: vendor

    };

  });

  return {

    comparison,

  };

}