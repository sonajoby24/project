import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export interface NLUResult {
  intent:
    | "PRODUCT_SEARCH"
    | "VENDOR_SEARCH"
    | "QUOTE_SEARCH"
    | "ORDER_SEARCH"
    | "COMPARE_VENDORS"
    | "SHOW_ALL_PRODUCTS"
    | "SHOW_ALL_VENDORS"
    | "SHOW_ALL_QUOTES"
    | "SHOW_ALL_ORDERS"
    | "REPORT"
    | "UNKNOWN";

  entityType: string;
  entityName: string;
  fields: string[];
}

export async function understandQuestion(
  question: string
): Promise<NLUResult> {
  try {
    const completion =
      await client.chat.completions.create({
        model: "openai/gpt-3.5-turbo",
        temperature: 0,
        max_tokens: 250,

        messages: [
          {
            role: "system",
            content: `
You are an NLU engine.

Return ONLY valid JSON.

Schema:

{
  "intent":"",
  "entityType":"",
  "entityName":"",
  "fields":[]
}

Intent values:

PRODUCT_SEARCH
VENDOR_SEARCH
QUOTE_SEARCH
ORDER_SEARCH
COMPARE_VENDORS
SHOW_ALL_PRODUCTS
SHOW_ALL_VENDORS
SHOW_ALL_QUOTES
SHOW_ALL_ORDERS
REPORT
UNKNOWN

Examples:

User:
show details of diode

Return

{
"intent":"PRODUCT_SEARCH",
"entityType":"Product",
"entityName":"Diode",
"fields":["*"]
}

User:
specification of resistor

Return

{
"intent":"PRODUCT_SEARCH",
"entityType":"Product",
"entityName":"Resistor",
"fields":["Specification"]
}

User:
What is Qualcomm AccountId?

Return

{
"intent":"VENDOR_SEARCH",
"entityType":"Vendor",
"entityName":"Qualcomm",
"fields":["AccountId"]
}

User:
email of Qualcomm

Return

{
"intent":"VENDOR_SEARCH",
"entityType":"Vendor",
"entityName":"Qualcomm",
"fields":["Email"]
}

User:
phone of Qualcomm

Return

{
"intent":"VENDOR_SEARCH",
"entityType":"Vendor",
"entityName":"Qualcomm",
"fields":["Phone"]
}

User:
status of vendors

Return

{
"intent":"SHOW_ALL_VENDORS",
"entityType":"Vendor",
"entityName":"",
"fields":["Status"]
}

User:
show all vendors

Return

{
"intent":"SHOW_ALL_VENDORS",
"entityType":"Vendor",
"entityName":"",
"fields":["*"]
}

User:
compare vendors

Return

{
"intent":"COMPARE_VENDORS",
"entityType":"Vendor",
"entityName":"",
"fields":[]
}

User:
show vendor comparison

Return

{
"intent":"COMPARE_VENDORS",
"entityType":"Vendor",
"entityName":"",
"fields":[]
}

User:
best vendor

Return

{
"intent":"COMPARE_VENDORS",
"entityType":"Vendor",
"entityName":"",
"fields":[]
}

User:
which vendor has highest rating

Return

{
"intent":"COMPARE_VENDORS",
"entityType":"Vendor",
"entityName":"",
"fields":["Rating"]
}

User:
cheapest vendor

Return

{
"intent":"COMPARE_VENDORS",
"entityType":"Vendor",
"entityName":"",
"fields":["UnitPrice"]
}

User:
generate report of quote 00000080

Return

{
"intent":"REPORT",
"entityType":"Quote",
"entityName":"00000080",
"fields":["*"]
}
User:
compare quotes

Return

{
"intent":"PROCUREMENT_ANALYSIS",
"entityType":"Quote",
"entityName":"",
"fields":["*"]
}

User:
lowest quote

Return

{
"intent":"PROCUREMENT_ANALYSIS",
"entityType":"Quote",
"entityName":"",
"fields":["UnitPrice"]
}

User:
cheapest vendor

Return

{
"intent":"PROCUREMENT_ANALYSIS",
"entityType":"Vendor",
"entityName":"",
"fields":["UnitPrice"]
}

User:
recommend vendor

Return

{
"intent":"PROCUREMENT_ANALYSIS",
"entityType":"Vendor",
"entityName":"",
"fields":["*"]
}

User:
procurement report

Return

{
"intent":"PROCUREMENT_ANALYSIS",
"entityType":"Quote",
"entityName":"",
"fields":["*"]
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

    return JSON.parse(text);

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