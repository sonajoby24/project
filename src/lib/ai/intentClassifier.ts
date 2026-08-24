export type Intent =
  | "PRODUCT_SEARCH"
  | "QUOTE_SEARCH"
  | "VENDOR_SEARCH"
  | "ORDER_SEARCH"
  | "COMPARE_VENDORS"
  | "SHOW_ALL_PRODUCTS"
  | "SHOW_ALL_QUOTES"
  | "SHOW_ALL_VENDORS"
  | "SHOW_ALL_ORDERS"
  | "REPORT"
  | "UNKNOWN";

export function classifyIntent(query: string): Intent {

  const q = query.toLowerCase();

  // Reports
  if (q.includes("report")) {
    return "REPORT";
  }

  // Compare Vendors
  if (
    q.includes("compare vendor") ||
    q.includes("best vendor") ||
    q.includes("cheapest vendor")
  ) {
    return "COMPARE_VENDORS";
  }

  // Show All
  if (q.includes("show all products"))
    return "SHOW_ALL_PRODUCTS";

  if (q.includes("show all quotes"))
    return "SHOW_ALL_QUOTES";

  if (q.includes("show all vendors"))
    return "SHOW_ALL_VENDORS";

  if (q.includes("show all orders"))
    return "SHOW_ALL_ORDERS";

  // Quote
  if (
    /0Q0[a-zA-Z0-9]+/.test(query) ||
    /\b\d{8}\b/.test(query) ||
    q.includes("quote")
  ) {
    return "QUOTE_SEARCH";
  }

  // Vendor
  if (
    /VEND-\d+/i.test(query) ||
    q.includes("vendor") ||
    q.includes("supplier")
  ) {
    return "VENDOR_SEARCH";
  }

  // Order
  if (
    /ORD\d+/i.test(query) ||
    q.includes("order")
  ) {
    return "ORDER_SEARCH";
  }

  // Product
  if (
    q.includes("product") ||
    q.includes("show details") ||
    q.includes("specification")
  ) {
    return "PRODUCT_SEARCH";
  }

  return "UNKNOWN";
}