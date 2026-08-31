import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

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

export async function understandQuestion(
  question: string
): Promise<NLUResult> {
  try {
    const completion = await client.chat.completions.create({
      model: "openai/gpt-3.5-turbo",
      temperature: 0,
      max_tokens: 250,

      messages: [
        {
          role: "system",
          content: `
You are an NLU engine for an enterprise procurement application.

Your job is to understand the user's natural-language request and
convert it into structured intent information.

Do NOT require the user to use exact keywords.

Understand the meaning of conversational questions.

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


INTENT DEFINITIONS:

PRODUCT_SEARCH:
Questions about a specific product, its details, specifications,
pricing, quantity, or other product information.

IMPORTANT PRODUCT RULE:

If the user names a product and asks for its price, unit price,
specification, quantity, or target price, classify the entity as:

"entityType": "Product"

Never classify a named product as Vendor merely because the
question involves price.

Examples:

"What is the price of Banana Jack?"
=> PRODUCT_SEARCH / Product / Banana Jack / UnitPrice

"What is the specification of Banana Jack?"
=> PRODUCT_SEARCH / Product / Banana Jack / Specification

"What is the quantity of Banana Jack?"
=> PRODUCT_SEARCH / Product / Banana Jack / Quantity

VENDOR_SEARCH:
Questions about a specific vendor or supplier and its information,
such as email, phone, account ID, status, rating, or delivery details.

QUOTE_SEARCH:
Questions about a specific quotation or quote.

ORDER_SEARCH:
Questions about a specific order.

COMPARE_VENDORS:
Requests to compare vendors or suppliers based on price,
rating, delivery, or other vendor-level criteria.

PROCUREMENT_ANALYSIS:
Requests for procurement-level analysis, purchasing recommendations,
supplier allocation, cost analysis, fulfillment analysis, risks,
missing products, savings, or overall procurement strategy.

SHOW_ALL_PRODUCTS:
Requests to list or display all products.

SHOW_ALL_VENDORS:
Requests to list or display all vendors.

SHOW_ALL_QUOTES:
Requests to list or display all quotes.

SHOW_ALL_ORDERS:
Requests to list or display all orders.

REPORT:
Requests to generate or retrieve a report, especially for a
specific quote.

UNKNOWN:
Use when the request cannot be reliably classified.


EXAMPLES:

User:
"Can you tell me everything about the diode?"

Return:
{
  "intent": "PRODUCT_SEARCH",
  "entityType": "Product",
  "entityName": "Diode",
  "fields": ["*"]
}


User:
"What are the specifications of the resistor?"

Return:
{
  "intent": "PRODUCT_SEARCH",
  "entityType": "Product",
  "entityName": "Resistor",
  "fields": ["Specification"]
}


User:
"Could you give me Qualcomm's email address?"

Return:
{
  "intent": "VENDOR_SEARCH",
  "entityType": "Vendor",
  "entityName": "Qualcomm",
  "fields": ["Email"]
}


User:
"How can I contact Qualcomm?"

Return:
{
  "intent": "VENDOR_SEARCH",
  "entityType": "Vendor",
  "entityName": "Qualcomm",
  "fields": ["Email", "Phone"]
}


User:
"Which supplier offers the lowest price?"

Return:
{
  "intent": "COMPARE_VENDORS",
  "entityType": "Vendor",
  "entityName": "",
  "fields": ["UnitPrice"]
}


User:
"Which vendor has the highest rating?"

Return:
{
  "intent": "COMPARE_VENDORS",
  "entityType": "Vendor",
  "entityName": "",
  "fields": ["Rating"]
}


User:
"Can you compare the suppliers for me?"

Return:
{
  "intent": "COMPARE_VENDORS",
  "entityType": "Vendor",
  "entityName": "",
  "fields": ["*"]
}


User:
"Are there any products that weren't quoted?"

Return:
{
  "intent": "PROCUREMENT_ANALYSIS",
  "entityType": "Quote",
  "entityName": "",
  "fields": ["MissingProducts"]
}


User:
"Which supplier should we buy from?"

Return:
{
  "intent": "PROCUREMENT_ANALYSIS",
  "entityType": "Vendor",
  "entityName": "",
  "fields": ["*"]
}


User:
"Analyze the quotations and recommend the best purchasing strategy."

Return:
{
  "intent": "PROCUREMENT_ANALYSIS",
  "entityType": "Quote",
  "entityName": "",
  "fields": ["*"]
}


User:
"What risks should we consider before placing the order?"

Return:
{
  "intent": "PROCUREMENT_ANALYSIS",
  "entityType": "Quote",
  "entityName": "",
  "fields": ["Risks"]
}


User:
"Generate a report for quote 00000080."

Return:
{
  "intent": "REPORT",
  "entityType": "Quote",
  "entityName": "00000080",
  "fields": ["*"]
}


User:
"Show me all the suppliers."

Return:
{
  "intent": "SHOW_ALL_VENDORS",
  "entityType": "Vendor",
  "entityName": "",
  "fields": ["*"]
}


User:
"Give me the details of order ORD12345."

Return:
{
  "intent": "ORDER_SEARCH",
  "entityType": "Order",
  "entityName": "ORD12345",
  "fields": ["*"]
}
`,
        },
        {
          role: "user",
          content: question,
        },
      ],
    });

    const text =
      completion.choices[0].message.content || "{}";

    const result = JSON.parse(text);

    return {
      intent: result.intent ?? "UNKNOWN",
      entityType: result.entityType ?? "",
      entityName: result.entityName ?? "",
      fields: Array.isArray(result.fields)
        ? result.fields
        : [],
    };

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