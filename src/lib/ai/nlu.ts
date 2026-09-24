import {
  getLLMClient,
  getLLMModel,
  logLLMProvider,
} from "./llmProvider";

export type Intent =
  | "PRODUCT_SEARCH"
  | "VENDOR_SEARCH"
  | "QUOTE_SEARCH"
  | "ORDER_SEARCH"
  | "COMPARE_VENDORS"
  | "PROCUREMENT_ANALYSIS"
  | "SHOW_ALL_PRODUCTS"
  | "SHOW_ALL_VENDORS"
  | "SHOW_ALL_QUOTES"
  | "SHOW_ALL_ORDERS"
  | "REPORT"
  | "UNKNOWN";

export interface NLUResult {
  intent: Intent;
  entityType: string;
  entityName: string;
  fields: string[];
}

const VALID_INTENTS: Intent[] = [
  "PRODUCT_SEARCH",
  "VENDOR_SEARCH",
  "QUOTE_SEARCH",
  "ORDER_SEARCH",
  "COMPARE_VENDORS",
  "PROCUREMENT_ANALYSIS",
  "SHOW_ALL_PRODUCTS",
  "SHOW_ALL_VENDORS",
  "SHOW_ALL_QUOTES",
  "SHOW_ALL_ORDERS",
  "REPORT",
  "UNKNOWN",
];

function normalizeText(value: any): string {
  return String(value ?? "")
    .replace(/Â/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeComparisonResult(
  question: string,
  result: NLUResult
): NLUResult {
  const q = normalizeText(question);

  if (result.intent !== "COMPARE_VENDORS") {
    return result;
  }

  const explicitRating =
    q.includes("rating") ||
    q.includes("rated") ||
    q.includes("highest rating") ||
    q.includes("best rated") ||
    q.includes("highest rated") ||
    q.includes("top rated");

  const explicitPrice =
    q.includes("cheapest") ||
    q.includes("lowest price") ||
    q.includes("lowest priced") ||
    q.includes("best price") ||
    q.includes("lowest cost") ||
    q.includes("least expensive") ||
    q.includes("cheapest price");

  const productMentioned =
    result.entityType?.toLowerCase() === "product" &&
    Boolean(result.entityName?.trim());

  // ------------------------------------------------------------
  // RATING COMPARISON
  // ------------------------------------------------------------

  if (explicitRating) {
    return {
      ...result,
      intent: "COMPARE_VENDORS",
      entityType: "Vendor",
      fields: ["Rating"],
    };
  }

  // ------------------------------------------------------------
  // PRICE COMPARISON
  // ------------------------------------------------------------

  if (explicitPrice) {
    return {
      ...result,
      intent: "COMPARE_VENDORS",
      entityType: productMentioned ? "Product" : "Vendor",
      fields: ["UnitPrice"],
    };
  }

  // ------------------------------------------------------------
  // GENERIC BEST VENDOR
  // ------------------------------------------------------------

  const genericBest =
    q === "which is the best vendor" ||
    q === "which vendor is best" ||
    q === "who is the best vendor" ||
    q === "best vendor" ||
    q.startsWith("which is the best vendor for ") ||
    q.startsWith("which vendor is best for ") ||
    q.startsWith("best vendor for ");

  if (genericBest) {
    return {
      ...result,
      intent: "COMPARE_VENDORS",
      entityType: productMentioned ? "Product" : "Vendor",
      fields: ["Rating", "UnitPrice"],
    };
  }

  // ------------------------------------------------------------
  // COMPARE VENDORS
  // ------------------------------------------------------------

  if (
    q.includes("compare vendors") ||
    q.includes("compare suppliers") ||
    q === "compare vendors" ||
    q === "compare suppliers"
  ) {
    return {
      ...result,
      intent: "COMPARE_VENDORS",
      entityType: productMentioned ? "Product" : "Vendor",
      fields: ["Rating", "UnitPrice"],
    };
  }

  return result;
}

export async function understandQuestion(
  question: string
): Promise<NLUResult> {
  try {

    const client =
  getLLMClient();

const model =
  getLLMModel("default");

logLLMProvider("default");
  
    const completion = await client.chat.completions.create({
     model,
      temperature: 0,
      max_tokens: 300,

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "system",
          content: `
You are an NLU engine for an enterprise procurement application.

Your job is to understand the user's natural-language request and
convert it into structured intent information.

Return ONLY valid JSON.

Schema:

{
  "intent": "",
  "entityType": "",
  "entityName": "",
  "fields": []
}

Allowed intents:

PRODUCT_SEARCH
VENDOR_SEARCH
QUOTE_SEARCH
ORDER_SEARCH
COMPARE_VENDORS
PROCUREMENT_ANALYSIS
SHOW_ALL_PRODUCTS
SHOW_ALL_VENDORS
SHOW_ALL_QUOTES
SHOW_ALL_ORDERS
REPORT
UNKNOWN


============================================================
PRODUCT_SEARCH
============================================================

Questions about a specific product, including:

- product details
- specification
- price
- unit price
- quantity
- target price

If a product is explicitly named, entityType MUST be Product.

Examples:

"What is the price of Banana Jack?"

{
  "intent": "PRODUCT_SEARCH",
  "entityType": "Product",
  "entityName": "Banana Jack",
  "fields": ["UnitPrice"]
}

"What is the specification of Resistor?"

{
  "intent": "PRODUCT_SEARCH",
  "entityType": "Product",
  "entityName": "Resistor",
  "fields": ["Specification"]
}


============================================================
VENDOR_SEARCH
============================================================

Questions about a specific vendor.

Examples:

"What is the rating of Mouser Electronics?"

{
  "intent": "VENDOR_SEARCH",
  "entityType": "Vendor",
  "entityName": "Mouser Electronics",
  "fields": ["Rating"]
}

"What is the email of Element14?"

{
  "intent": "VENDOR_SEARCH",
  "entityType": "Vendor",
  "entityName": "Element14",
  "fields": ["Email"]
}


============================================================
COMPARE_VENDORS
============================================================

Use COMPARE_VENDORS when the user asks which vendor/supplier
should be selected or compared.


------------------------------------------------------------
PRICE
------------------------------------------------------------

If the user explicitly asks for:

- cheapest
- lowest price
- lowest cost
- best price
- least expensive

use:

"fields": ["UnitPrice"]

Examples:

"Which vendor is cheapest?"

{
  "intent": "COMPARE_VENDORS",
  "entityType": "Vendor",
  "entityName": "",
  "fields": ["UnitPrice"]
}

"Which vendor is cheapest for Resistor?"

{
  "intent": "COMPARE_VENDORS",
  "entityType": "Product",
  "entityName": "Resistor",
  "fields": ["UnitPrice"]
}


------------------------------------------------------------
RATING
------------------------------------------------------------

If the user explicitly asks for:

- highest rating
- best rating
- highest rated
- best rated
- rating

use:

"fields": ["Rating"]

Examples:

"Which vendor has the highest rating?"

{
  "intent": "COMPARE_VENDORS",
  "entityType": "Vendor",
  "entityName": "",
  "fields": ["Rating"]
}

"Best vendor based on rating?"

{
  "intent": "COMPARE_VENDORS",
  "entityType": "Vendor",
  "entityName": "",
  "fields": ["Rating"]
}


------------------------------------------------------------
GENERIC BEST VENDOR
------------------------------------------------------------

IMPORTANT:

Do NOT assume that "best vendor" means cheapest vendor.

"Best" without a specified criterion is a multi-criteria request.

Use:

"fields": ["Rating", "UnitPrice"]

Examples:

"Which is the best vendor?"

{
  "intent": "COMPARE_VENDORS",
  "entityType": "Vendor",
  "entityName": "",
  "fields": ["Rating", "UnitPrice"]
}

"Which is the best vendor for Resistor?"

{
  "intent": "COMPARE_VENDORS",
  "entityType": "Product",
  "entityName": "Resistor",
  "fields": ["Rating", "UnitPrice"]
}


============================================================
PRODUCT-SPECIFIC COMPARISON
============================================================

If the user names a product, preserve the exact product name
as entityName.

Examples:

"Which vendor is cheapest for Banana Jack?"

"Which vendor has the best rating for Banana Jack?"

"Which vendor is best for Resistor?"

entityType MUST be Product.


============================================================
PROCUREMENT_ANALYSIS
============================================================

Use for:

- procurement strategy
- supplier allocation
- quote analysis
- savings
- risks
- missing products
- purchasing recommendation


============================================================
SHOW ALL
============================================================

"Show all products"
=> SHOW_ALL_PRODUCTS

"Show all vendors"
=> SHOW_ALL_VENDORS

"Show all quotes"
=> SHOW_ALL_QUOTES

"Show all orders"
=> SHOW_ALL_ORDERS


============================================================
REPORT
============================================================

Use REPORT for requests to generate/retrieve a report.


============================================================
IMPORTANT RULES
============================================================

1. Never invent entities.
2. Preserve named product/vendor names.
3. Explicit Rating => Rating.
4. Explicit Price => UnitPrice.
5. Generic Best => Rating + UnitPrice.
6. Never treat generic "best" as automatically "cheapest".
7. Return only JSON.
`,
        },
        {
          role: "user",
          content: question,
        },
      ],
    });

    const text =
      completion.choices[0]?.message?.content || "{}";

    console.log("========== NLU ==========");
    console.log(text);
    console.log("=========================");

    const parsed = JSON.parse(text);

    const result: NLUResult = {
      intent: VALID_INTENTS.includes(parsed.intent)
        ? parsed.intent
        : "UNKNOWN",

      entityType:
        typeof parsed.entityType === "string"
          ? parsed.entityType
          : "",

      entityName:
        typeof parsed.entityName === "string"
          ? parsed.entityName
          : "",

      fields:
        Array.isArray(parsed.fields)
          ? parsed.fields.map((field: any) =>
              String(field)
            )
          : [],
    };

    return normalizeComparisonResult(
      question,
      result
    );
  } catch (err) {
    console.error("NLU ERROR", err);

    return {
      intent: "UNKNOWN",
      entityType: "",
      entityName: "",
      fields: [],
    };
  }
}