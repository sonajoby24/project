import { GoogleGenAI } from "@google/genai";

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
   GEMINI PROCUREMENT AGENT
   ============================================================

   IMPORTANT ARCHITECTURE:

   Deterministic code:
      - retrieves Firebase data
      - matches products
      - calculates prices
      - calculates quantities
      - calculates differences
      - identifies missing products
      - identifies vendor coverage

   Gemini:
      - interprets the evidence
      - reasons about trade-offs
      - evaluates procurement strategy
      - identifies risks
      - identifies opportunities
      - recommends actions
      - provides confidence

   Gemini DOES NOT change factual calculations.
   ============================================================ */

export async function runProcurementAgent(
  procurementEvidence: any
): Promise<ProcurementAIResult> {

  console.log(
    "===================================="
  );

  console.log(
    "GEMINI PROCUREMENT EVIDENCE"
  );

  console.log(
    JSON.stringify(
      procurementEvidence,
      null,
      2
    )
  );

  console.log(
    "===================================="
  );

  const apiKey =
    process.env.GEMINI_API_KEY;


  console.log(
    "GEMINI API KEY PRESENT:",
    Boolean(apiKey)
  );


  if (!apiKey) {

    throw new Error(
      "GEMINI_API_KEY is not configured in .env.local"
    );

  }


  /* ============================================================
     2. CREATE GEMINI CLIENT
     ============================================================ */

  const ai =
    new GoogleGenAI({
      apiKey
    });


  /* ============================================================
     3. SYSTEM INSTRUCTION
     ============================================================ */

  const systemInstruction = `

You are Catalogix Procurement Intelligence Agent.

You are the AI reasoning layer of an agentic procurement system.

The application has already retrieved and calculated the
procurement evidence.

Your job is NOT to perform basic arithmetic again.

Your job is to reason over the evidence and make an intelligent
procurement assessment.

------------------------------------------------------------
FACTUAL EVIDENCE PROVIDED BY THE APPLICATION
------------------------------------------------------------

The evidence may contain:

- Master quote information
- Vendor quote information
- Product names
- Product specifications
- Requested quantities
- Vendor quantities
- Target prices
- Vendor prices
- Price differences
- Quantity matches
- Specification matches
- Missing products
- Extra products
- Vendor coverage
- Cheapest vendor per product
- Combined vendor cost
- Price compliance
- Quantity compliance

Treat these values as authoritative.

DO NOT modify them.

------------------------------------------------------------
YOUR RESPONSIBILITY
------------------------------------------------------------

Reason about:

1. Overall procurement strategy
2. Vendor suitability
3. Product-level recommendations
4. Commercial risks
5. Quantity fulfilment risks
6. Specification risks
7. Missing quotation risks
8. Cost-saving opportunities
9. Vendor concentration
10. Single-vendor versus multi-vendor strategy
11. Products requiring human review
12. Procurement actions

------------------------------------------------------------
IMPORTANT REASONING RULES
------------------------------------------------------------

A cheapest vendor is NOT automatically the best vendor.

Consider:

- price
- quantity fulfilment
- specification compliance
- vendor coverage
- missing products
- price above target
- price below target
- concentration across vendors

If a vendor has a lower price but does not satisfy quantity
requirements, treat that as a risk.

If a product is missing from all vendors, classify it as
"Not Quoted".

Never treat a missing product as zero cost.

If a vendor price is above the target price, identify it as a
commercial risk.

If a vendor price is below the target price, identify the
difference as a potential cost-saving opportunity.

If specifications do not match, identify a technical risk.

If requested quantity is greater than vendor quantity,
identify a fulfilment risk.

------------------------------------------------------------
VENDOR STRATEGY
------------------------------------------------------------

Evaluate whether:

A. A single vendor strategy is supported by the evidence.

OR

B. A multi-vendor strategy is better supported.

Do not automatically recommend splitting procurement.

Only recommend a split-vendor strategy when the evidence
supports meaningful benefits such as:

- better product coverage
- lower product-level cost
- better quantity fulfilment
- better specification compliance

Do NOT invent:

- shipping costs
- delivery dates
- lead times
- stock availability
- warranty
- supplier quality
- payment terms
- logistics information

If such information is unavailable, say that human review is
required.

------------------------------------------------------------
CONFIDENCE
------------------------------------------------------------

High:

The supplied evidence strongly supports the recommendation.

Medium:

The evidence supports the recommendation but there are
meaningful trade-offs.

Low:

Important information is missing and human review is required.

------------------------------------------------------------
TRACEABILITY
------------------------------------------------------------

Every recommendation must be explainable from the supplied
procurement evidence.

Never invent facts.

Never invent vendors.

Never invent prices.

Never invent quantities.

Never invent specifications.

------------------------------------------------------------
OUTPUT
------------------------------------------------------------

Return ONLY valid JSON matching the requested schema.

`;


  /* ============================================================
     4. BUILD PROCUREMENT PROMPT
     ============================================================ */

  const prompt = `

You are analysing VERIFIED procurement evidence generated by
the Catalogix procurement engine.

The evidence below is authoritative.

==============================
PROCUREMENT EVIDENCE
==============================

${JSON.stringify(
  procurementEvidence,
  null,
  2
)}

==============================
YOUR TASK
==============================

Perform intelligent procurement reasoning.

Determine:

1. The best overall procurement strategy.

2. The overall procurement assessment.

3. Which vendors are suitable and why.

4. Which products should be recommended.

5. Which products require human review.

6. Which products should not be recommended.

7. Which products are not quoted.

8. Procurement risks.

9. Cost-saving opportunities.

10. Important procurement insights.

11. Concrete procurement actions.

12. Whether the evidence supports a single-vendor
    or multi-vendor procurement strategy.

IMPORTANT:

Do not change any factual values from the evidence.

Do not invent missing information.

Every recommendation must be traceable to the evidence.

Think like an experienced procurement analyst rather than
simply selecting the cheapest price.

Return ONLY JSON.

`;


  /* ============================================================
     5. SEND EVIDENCE TO GEMINI
     ============================================================ */

  console.log(
    "=================================================="
  );

  console.log(
    "🚀 SENDING PROCUREMENT EVIDENCE TO GEMINI"
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

    const response =
      await ai.models.generateContent({

        /*
         * Gemini reasoning model
         *
         * Gemini 3.6 Flash supports thinking configuration.
         */

        model:
          "gemini-2.5-flash",

        contents:
          prompt,

        config: {

          systemInstruction,

          /*
           * We need machine-readable JSON because
           * the dashboard will consume this result.
           */

          responseMimeType:
            "application/json",

          responseSchema: {

            type: "object",

            properties: {

              executiveRecommendation: {

                type: "string"

              },


              overallAssessment: {

                type: "string"

              },


              recommendedVendors: {

                type: "array",

                items: {

                  type: "object",

                  properties: {

                    vendor: {

                      type: "string"

                    },

                    products: {

                      type: "array",

                      items: {

                        type: "string"

                      }

                    },

                    reason: {

                      type: "string"

                    },

                    confidence: {

                      type: "string",

                      enum: [

                        "High",

                        "Medium",

                        "Low"

                      ]

                    }

                  },

                  required: [

                    "vendor",

                    "products",

                    "reason",

                    "confidence"

                  ]

                }

              },


              productRecommendations: {

                type: "array",

                items: {

                  type: "object",

                  properties: {

                    product: {

                      type: "string"

                    },

                    specification: {

                      type: "string"

                    },

                    recommendation: {

                      type: "string",

                      enum: [

                        "Recommended",

                        "Review",

                        "Not Recommended",

                        "Not Quoted"

                      ]

                    },

                    reason: {

                      type: "string"

                    },

                    risk: {

                      type: "string"

                    }

                  },

                  required: [

                    "product",

                    "specification",

                    "recommendation",

                    "reason",

                    "risk"

                  ]

                }

              },


              risks: {

                type: "array",

                items: {

                  type: "string"

                }

              },


              opportunities: {

                type: "array",

                items: {

                  type: "string"

                }

              },


              insights: {

                type: "array",

                items: {

                  type: "string"

                }

              },


              procurementActions: {

                type: "array",

                items: {

                  type: "string"

                }

              }

            },


            required: [

              "executiveRecommendation",

              "overallAssessment",

              "recommendedVendors",

              "productRecommendations",

              "risks",

              "opportunities",

              "insights",

              "procurementActions"

            ]

          },

          /*
           * Keep temperature / randomness low because
           * procurement recommendations must be consistent.
           */

          temperature:
            0.2,

          /*
           * Enable deeper model reasoning where supported.
           */

        }

      });


    /* ============================================================
       6. RECEIVE GEMINI RESPONSE
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
      response.text;


    console.log(
      "GEMINI RAW RESPONSE:"
    );

    console.log(
      rawText
    );


    /* ============================================================
       7. CHECK EMPTY RESPONSE
       ============================================================ */

    if (!rawText) {

      throw new Error(
        "Gemini returned an empty procurement analysis."
      );

    }


    /* ============================================================
       8. PARSE STRUCTURED JSON
       ============================================================ */

    try {

      const parsed =
        JSON.parse(rawText);


      console.log(
        "=================================================="
      );

      console.log(
        "✅ GEMINI PROCUREMENT JSON PARSED SUCCESSFULLY"
      );

      console.log(
        "=================================================="
      );


      return parsed;


    } catch (error) {

      console.error(
        "❌ INVALID GEMINI PROCUREMENT JSON"
      );

      console.error(
        rawText
      );

      throw new Error(
        "Gemini returned invalid procurement analysis JSON."
      );

    }

  } catch (error: any) {

    console.error(
      "=================================================="
    );

    console.error(
      "❌ GEMINI PROCUREMENT AGENT ERROR"
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