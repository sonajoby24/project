export function rewriteQuery(query: string): string {

  let q = query
    .trim()
    .toLowerCase();

  // Remove punctuation
  q = q.replace(/[?!.,]/g, "");

  // Remove extra spaces
  q = q.replace(/\s+/g, " ");

  // Quote shorthand
  q = q.replace(
    /\bquote\s+(\d{1,8})\b/,
    (_, num) => `quote number ${num.padStart(8, "0")}`
  );

  // Common synonyms
  q = q.replace(/\bdetails\b/g, "show details");
  q = q.replace(/\bdetail\b/g, "show details");
  q = q.replace(/\binfo\b/g, "show details");
  q = q.replace(/\binformation\b/g, "show details");
  q = q.replace(/\bspec\b/g, "specification");
  q = q.replace(/\bvendors\b/g, "vendor");

  // Header shortcut
  q = q.replace(/\bheader\b/g, "header");

  // Cheapest vendor
  if (q.includes("cheapest vendor")) {
    return "compare all vendors by unit price";
  }

  // Best vendor
  if (q.includes("best vendor")) {
    return "compare vendors";
  }

  return q;
}