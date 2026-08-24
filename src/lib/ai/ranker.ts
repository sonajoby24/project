export function rankResults(data: any) {

  if (!data) return data;

  const ranked = { ...data };

  // Products
  if (Array.isArray(ranked.products)) {

    ranked.products = ranked.products
      .sort((a: any, b: any) => {

        const scoreA =
          Number(a.relevanceScore || 0);

        const scoreB =
          Number(b.relevanceScore || 0);

        return scoreB - scoreA;

      })
      .slice(0, 10);

  }

  // Vendors
  if (Array.isArray(ranked.vendors)) {

    ranked.vendors = ranked.vendors
      .sort((a: any, b: any) => {

        const ratingA =
          Number(a.rating || 0);

        const ratingB =
          Number(b.rating || 0);

        return ratingB - ratingA;

      })
      .slice(0, 10);

  }

  // Quotes
  if (Array.isArray(ranked.quotes)) {

    ranked.quotes =
      ranked.quotes.slice(0, 10);

  }

  // Orders
  if (Array.isArray(ranked.orders)) {

    ranked.orders =
      ranked.orders.slice(0, 10);

  }

  return ranked;

}