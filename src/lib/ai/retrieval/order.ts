import { adminDb } from "@/lib/firebase-admin";

export async function retrieveOrders(query: string) {

  const data: any = {};

  const snapshot =
    await adminDb
      .collection("orders")
      .get();

  const orders =
    snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

  // -----------------------
  // Show All Orders
  // -----------------------

  if (
    query.toLowerCase().includes("show all orders") ||
    query.toLowerCase().includes("list all orders")
  ) {

    data.orders = orders;

    return data;

  }

  // -----------------------
  // Order ID Search
  // -----------------------

  const orderMatch =
    query.match(/ORD\d+/i);

  if (orderMatch) {

    const orderId = orderMatch[0];

    const result =
      orders.filter((order: any) =>

        String(order.orderId || "")
          .toLowerCase()
          .includes(orderId.toLowerCase())

      );

    data.orders = result;

    return data;

  }

  return {};

}