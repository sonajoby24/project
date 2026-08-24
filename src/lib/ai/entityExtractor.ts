export interface EntityResult {

  product?: string;

  vendor?: string;

  quoteId?: string;

  quoteNumber?: string;

  orderId?: string;

}

export function extractEntities(query: string): EntityResult {

  const q = query.toLowerCase();

  const result: EntityResult = {};

  // Quote ID
  const quoteId =
    query.match(/0Q0[a-zA-Z0-9]+/);

  if (quoteId) {

    result.quoteId = quoteId[0];

  }

  // Quote Number
  const quoteNumber =
    query.match(/\b\d{8}\b/);

  if (quoteNumber) {

    result.quoteNumber = quoteNumber[0];

  }

  // Vendor ID
  const vendor =
    query.match(/VEND-\d+/i);

  if (vendor) {

    result.vendor = vendor[0];

  }

  // Order ID
  const order =
    query.match(/ORD\d+/i);

  if (order) {

    result.orderId = order[0];

  }

  // Product Name

  const product =
    query.match(
      /(?:show details of|details of|specification of|product|about)\s+(.+)/i
    );

  if (product) {

    result.product =
      product[1].trim();

  }

  return result;

}