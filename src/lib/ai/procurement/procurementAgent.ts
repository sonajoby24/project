
import {
  getLLMClient,
  getLLMModel,
  logLLMProvider,
} from "../llmProvider";

/* ============================================================
   GEMINI PROCUREMENT AI RESULT
   ============================================================ */

export interface ProcurementAIResult {
  executiveRecommendation: string;

  overallAssessment: string;

  recommendedVendors: Array<{
    vendor: string;
    products: string[];
    reason: string;
    confidence: "High" | "Medium" | "Low";
  }>;

  productRecommendations: Array<{
    product: string;
    specification: string;

    recommendation:
      | "Recommended"
      | "Review"
      | "Not Recommended"
      | "Not Quoted";

    reason: string;

    risk: string;
  }>;

  risks: string[];

  opportunities: string[];

  insights: string[];

  procurementActions: string[];
}


/* ============================================================
   PROCUREMENT AGENT
   ============================================================ */

export async function runProcurementAgent(
  procurementEvidence: any
): Promise<ProcurementAIResult> {

  console.log("====================================");
  console.log("GEMINI PROCUREMENT EVIDENCE");
  console.log("====================================");

  console.log(
    JSON.stringify(
      procurementEvidence,
      null,
      2
    )
  );

  /* ============================================================
     AI INSTRUCTION
     ============================================================ */

  const systemInstruction = `
You are Catalogix Procurement Intelligence Agent.

You analyze factual procurement evidence generated directly
from procurement data retrieved from Firestore.

The procurement evidence is the factual source of truth.

The application has already calculated factual comparisons
such as:

- products
- specifications
- quantities
- vendor prices
- target prices
- totals
- quantity matches
- price matches
- missing products
- extra products
- vendor coverage
- procurement metrics

Your responsibility is to interpret and explain this evidence
and produce procurement intelligence.

Do not invent or change factual values.

Do not invent:

- vendors
- products
- prices
- quantities
- specifications
- costs
- delivery dates
- lead times
- stock information
- warranty information
- payment terms
- supplier performance
- logistics information

If information is unavailable, explicitly identify it as an
information gap when relevant.

You may reason over relationships between the supplied values.

You may compare vendors.

You may compare prices.

You may evaluate quantities.

You may evaluate specifications.

You may identify missing products.

You may identify commercial or technical risks.

You may identify cost-saving opportunities.

You may recommend procurement actions.

All factual conclusions must be supported by the supplied
procurement evidence.

Do not replace factual evidence with assumptions.

Do not create a vendor, product, price, quantity, specification,
or cost that does not exist in the evidence.

For every product, determine the most appropriate procurement
assessment based on the complete evidence available for that
product.

For Master Quote reports, the evidence contains the selected
Master Quote and its actual child/vendor quotations.

For Transactional Quote reports, the evidence contains the
selected transactional quote and its exact parent Master Quote.

Respect the distinction between these two report modes.

For Master Quote reports, analyze the complete set of child/vendor
quotations supplied in the evidence.

For Transactional Quote reports, analyze only the selected
transactional quote against its parent Master Quote.

Do not assume that a particular vendor is better.

Do not assume that the cheapest vendor is automatically the best
procurement choice.

Do not invent additional procurement criteria that are not
supported by the evidence.

When multiple procurement strategies are possible, explain the
trade-offs using only the available evidence.

The output structure is fixed because it is consumed by the
application, but the content must be generated dynamically from
the supplied procurement evidence.

Return ONLY valid JSON matching the requested schema.

Do not return Markdown.

Do not return code fences.

Do not add explanations outside the JSON object.
`;


  /* ============================================================
     PROCUREMENT EVIDENCE PROMPT
     ============================================================ */

  const prompt = `
Analyze the following procurement evidence.

This is the actual procurement data retrieved by the
application.

==============================
PROCUREMENT EVIDENCE
==============================

${JSON.stringify(
  procurementEvidence,
  null,
  2
)}

==============================

Perform a complete AI-driven procurement analysis.

Determine dynamically:

1. Overall procurement assessment.

2. Executive procurement recommendation.

3. Suitable vendor or vendors.

4. Product-level procurement recommendations.

5. Specification considerations.

6. Price considerations.

7. Quantity considerations.

8. Missing quotation coverage.

9. Procurement risks.

10. Cost-saving opportunities.

11. Important procurement insights.

12. Recommended procurement actions.

Consider all available evidence together rather than applying
a single fixed decision rule.

Use the exact product names, vendor names, quantities,
specifications and prices supplied in the evidence.

Do not invent information.

If the evidence contains multiple possible procurement
strategies, explain the trade-offs and select the strategy
that is best supported by the evidence.

Return ONLY JSON.

The JSON must follow this exact structure:

{
  "executiveRecommendation": "string",
  "overallAssessment": "string",
  "recommendedVendors": [
    {
      "vendor": "string",
      "products": ["string"],
      "reason": "string",
      "confidence": "High"
    }
  ],
  "productRecommendations": [
    {
      "product": "string",
      "specification": "string",
      "recommendation": "Recommended",
      "reason": "string",
      "risk": "string"
    }
  ],
  "risks": ["string"],
  "opportunities": ["string"],
  "insights": ["string"],
  "procurementActions": ["string"]
}

Allowed values for product recommendation:

- Recommended
- Review
- Not Recommended
- Not Quoted

Allowed values for vendor confidence:

- High
- Medium
- Low

Return ONLY the JSON object.
Keep the response concise.
Keep each reason and risk to one short sentence.
Do not repeat the same explanation unnecessarily.
Generate productRecommendations only for products present in the supplied evidence.
`;


  /* ============================================================
     SEND PROCUREMENT EVIDENCE TO GEMINI
     ============================================================ */

  console.log(
    "=================================================="
  );

 console.log(
  "🚀 SENDING PROCUREMENT EVIDENCE TO LLM"
);

console.log(
  "LLM Provider:",
  process.env.LLM_PROVIDER || "gemini"
);

console.log(
  "LLM Model:",
  getLLMModel("procurement")
);

  console.log(
    "Evidence size:",
    JSON.stringify(procurementEvidence).length,
    "characters"
  );

  console.log(
    "=================================================="
  );


  try {

    const client =
  getLLMClient();

const model =
  getLLMModel("procurement");

logLLMProvider("procurement");

let response: any = null;

const MAX_RETRIES = 3;

for (
  let attempt = 1;
  attempt <= MAX_RETRIES;
  attempt++
) {
  try {

    console.log(
      `🚀 Gemini procurement request attempt ${attempt}/${MAX_RETRIES}`
    );

    response =
      await client.chat.completions.create({

        model,

        temperature: 0.2,

       max_tokens: 3000,

        response_format: {
          type: "json_object",
        },

        messages: [

          {
            role: "system",

            content:
              systemInstruction,
          },

          {
            role: "user",

            content:
              prompt,
          },

        ],

      });

    // Request succeeded
    break;

  } catch (error: any) {

    const status =
      error?.status ??
      error?.statusCode ??
      error?.response?.status;

    console.error(
      `❌ Gemini request failed on attempt ${attempt}/${MAX_RETRIES}`
    );

    console.error(
      "Status:",
      status
    );

    console.error(
      "Error:",
      error?.message || error
    );

    // Retry only temporary server errors
    if (
      status !== 503 ||
      attempt === MAX_RETRIES
    ) {
      throw error;
    }

    const delay =
      1000 * Math.pow(2, attempt - 1);

    console.log(
      `⏳ Gemini returned 503. Retrying in ${delay}ms...`
    );

    await new Promise(
      (resolve) =>
        setTimeout(resolve, delay)
    );

  }
}

  console.log(
  "LLM FINISH REASON:",
  response.choices[0]?.finish_reason
);

    /* ============================================================
       HANDLE GEMINI API ERRORS
       ============================================================ */

    

    /* ============================================================
       GEMINI RESPONSE RECEIVED
       ============================================================ */

    console.log(
      "=================================================="
    );

    console.log(
      "✅ GEMINI RESPONSE RECEIVED"
    );

    console.log(
      "=================================================="
    );


   const rawText =
  response
    .choices[0]
    ?.message
    ?.content
    ?.trim();


    console.log(
      "LLM RAW RESPONSE:"
    );

    console.log(rawText);


    if (!rawText) {
throw new Error(
  "LLM returned an empty procurement analysis."
);

    }


    /* ============================================================
       CLEAN JSON RESPONSE
       ============================================================ */

    let cleanedText =
      String(rawText).trim();


    if (
      cleanedText.startsWith("```json")
    ) {

      cleanedText =
        cleanedText.substring(7);

    } else if (
      cleanedText.startsWith("```")
    ) {

      cleanedText =
        cleanedText.substring(3);

    }


    if (
      cleanedText.endsWith("```")
    ) {

      cleanedText =
        cleanedText.substring(
          0,
          cleanedText.length - 3
        );

    }


    cleanedText =
      cleanedText.trim();


    /* ============================================================
       PARSE JSON
       ============================================================ */

    try {

      const parsed =
        JSON.parse(cleanedText);


      console.log(
        "===================================="
      );

      console.log(
        "✅ GEMINI PROCUREMENT JSON PARSED SUCCESSFULLY"
      );

      console.log(
        "====================================");


      return parsed as ProcurementAIResult;


    } catch (error) {

      console.error(
        "===================================="
      );

      console.error(
        "❌ INVALID PROCUREMENT JSON"
      );

      console.error(
        "===================================="
      );

      console.error(
        cleanedText
      );


     throw new Error(
  "LLM returned invalid procurement analysis JSON."
);

    }


  } catch (error: any) {

    console.error(
      "=================================================="
    );

    console.error(
      "❌ PROCUREMENT AGENT ERROR"
    );

    console.error(
      error
    );

    console.error(
      "=================================================="
    );

    throw error;

  }

}