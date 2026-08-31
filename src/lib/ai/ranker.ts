export function rankResults(data: any) {

  if (!data) {
    return data;
  }

  const ranked = {
    ...data
  };

  // ============================================================
  // PRODUCTS
  // ============================================================

  if (Array.isArray(ranked.products)) {

    ranked.products =
      ranked.products.sort(
        (a: any, b: any) => {

          const scoreA =
            Number(
              a.score ??
              a.relevanceScore ??
              0
            );

          const scoreB =
            Number(
              b.score ??
              b.relevanceScore ??
              0
            );

          return scoreB - scoreA;
        }
      );
  }


  // ============================================================
  // VENDORS
  // ============================================================

  if (Array.isArray(ranked.vendors)) {

    ranked.vendors =
      ranked.vendors.sort(
        (a: any, b: any) => {

          const ratingA =
            Number(
              a.rating ??
              a.Rating ??
              0
            );

          const ratingB =
            Number(
              b.rating ??
              b.Rating ??
              0
            );

          return ratingB - ratingA;
        }
      );
  }


  // ============================================================
  // QUOTES
  //
  // IMPORTANT:
  // Do NOT slice quotes.
  //
  // Procurement analysis may require:
  // 1. Master quote
  // 2. Multiple vendor quotes
  // ============================================================

  if (Array.isArray(ranked.quotes)) {

    ranked.quotes =
      [...ranked.quotes];
  }


  // ============================================================
  // ORDERS
  // ============================================================

  if (Array.isArray(ranked.orders)) {

    ranked.orders =
      [...ranked.orders];
  }


  // ============================================================
  // QUOTE LINES
  // ============================================================

  if (Array.isArray(ranked.quoteLines)) {

    ranked.quoteLines =
      [...ranked.quoteLines];
  }


  return ranked;
}