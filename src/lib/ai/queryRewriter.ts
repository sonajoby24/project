export function rewriteQuery(query: string): string {
  let q = query.trim();

  // Remove unnecessary punctuation
  q = q.replace(/[?!.,]/g, "");

  // Normalize extra spaces
  q = q.replace(/\s+/g, " ");

  // Normalize quote number shorthand
  q = q.replace(
    /\bquote\s+(\d{1,8})\b/i,
    (_, num) =>
      `quote number ${num.padStart(8, "0")}`
  );

  // Safe vocabulary normalization
  q = q.replace(/\bdetails\b/gi, "details");
  q = q.replace(/\bdetail\b/gi, "details");
  q = q.replace(/\binfo\b/gi, "information");
  q = q.replace(/\binformation\b/gi, "information");
  q = q.replace(/\bspec\b/gi, "specification");

  // Do NOT classify intent here.
  //
  // Examples:
  // "cheapest vendor"
  // "best supplier"
  // "which supplier is cheaper"
  // "who should we buy from"
  //
  // These must be interpreted by the LLM NLU.

  return q;
}