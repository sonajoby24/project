import { adminDb } from "@/lib/firebase-admin";

export async function retrieveOrders(
  plan: any
) {
  const data: any = {
    orders: [],
  };

  const snapshot =
    await adminDb
      .collection("orders")
      .get();

  const orders =
    snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  // -----------------------------------------
  // SHOW ALL ORDERS
  // -----------------------------------------

  if (
    plan.intent ===
    "SHOW_ALL_ORDERS"
  ) {
    data.orders = orders;
    return data;
  }

  // -----------------------------------------
  // ORDER ENTITY FROM PLANNER
  // -----------------------------------------

  const orderId =
    String(
      plan.entities?.order || ""
    )
      .trim()
      .toLowerCase();

  console.log(
    "SEARCH ORDER ENTITY:",
    orderId
  );

  if (!orderId) {
    return data;
  }

  // -----------------------------------------
  // SEARCH ORDER
  // -----------------------------------------

  data.orders =
    orders.filter(
      (order: any) =>
        String(
          order.orderId || ""
        )
          .toLowerCase()
          === orderId
    );

  return data;
}