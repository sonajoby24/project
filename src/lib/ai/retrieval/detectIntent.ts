export type RetrievalIntent =
  | "SHOW_ALL_PRODUCTS"
  | "SHOW_ALL_VENDORS"
  | "SHOW_ALL_QUOTES"
  | "SHOW_ALL_ORDERS"
  | "PRODUCT_SEARCH"
  | "QUOTE_SEARCH"
  | "VENDOR_SEARCH"
  | "ORDER_SEARCH"
  | "REPORT"
  | "COMPARE_VENDORS"
  | "UNKNOWN";

export function detectIntent(query: string): RetrievalIntent {

  const q = query.toLowerCase();

  // Report
  if (
    q.includes("generate report") ||
    q.includes("report")
  ) {
    return "REPORT";
  }

  // Vendor comparison
  if (
    q.includes("best vendor") ||
    q.includes("compare vendors") ||
    q.includes("cheapest vendor")
  ) {
    return "COMPARE_VENDORS";
  }

  // Products
  if (
    q.includes("show all products") ||
    q.includes("list all products")
  ) {
    return "SHOW_ALL_PRODUCTS";
  }

  // Vendors
  if (
    q.includes("show all vendors") ||
    q.includes("list all vendors")
  ) {
    return "SHOW_ALL_VENDORS";
  }

  // Quotes
  if (
    q.includes("show all quotes") ||
    q.includes("list all quotes")
  ) {
    return "SHOW_ALL_QUOTES";
  }

  // Orders
  if (
    q.includes("show all orders") ||
    q.includes("list all orders")
  ) {
    return "SHOW_ALL_ORDERS";
  }

  // Quote Number
  if (/\b\d{8}\b/.test(query)) {
    return "QUOTE_SEARCH";
  }

  // Quote ID
  if (/0Q0[a-zA-Z0-9]+/.test(query)) {
    return "QUOTE_SEARCH";
  }

  // Vendor ID
  if (/VEND-\d+/i.test(query)) {
    return "VENDOR_SEARCH";
  }

  // Product ID
  if (/P\d+/i.test(query)) {
    return "PRODUCT_SEARCH";
  }

  // Order ID
  if (/ORD\d+/i.test(query)) {
    return "ORDER_SEARCH";
  }

  // -----------------------------
// Vendor Search
// -----------------------------
if (
  q.includes("vendor") ||
  q.includes("vendors") ||
  q.includes("supplier") ||
  q.includes("accountid") ||
  q.includes("account id") ||
  q.includes("email") ||
  q.includes("phone") ||
  q.includes("qualcomm") ||
  q.includes("kaavium")
) {
  return "VENDOR_SEARCH";
}

// -----------------------------
// Quote Search
// -----------------------------
if (
  q.includes("quote")
) {
  return "QUOTE_SEARCH";
}

// -----------------------------
// Product Search
// -----------------------------
if (
  q.includes("product") ||
  q.includes("spec") ||
  q.includes("specification") ||
  q.includes("header") ||
  q.includes("banana jack") ||
  q.includes("resistor") ||
  q.includes("diode") ||
  q.includes("transistor") ||
  q.includes("capacitor")
) {
  return "PRODUCT_SEARCH";
}

  return "UNKNOWN";
}