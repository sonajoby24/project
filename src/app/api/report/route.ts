import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";

import {
  generateMasterQuoteReport,
} from "@/lib/ai/procurement/masterQuoteReport";

import {
  generateTransactionalQuoteReport,
} from "@/lib/ai/procurement/transactionalQuoteReport";

import {
  runProcurementAgent,
} from "@/lib/ai/procurement/procurementAgent";


/* ============================================================
   HELPERS
   ============================================================ */

function normalize(value: any = ""): string {
  return String(value)
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}


function normalizeId(value: any): string {
  return String(value || "").trim();
}


/*
 * Get Parent Quote ID.
 *
 * Transactional quotes may contain the parent Master Quote ID
 * using slightly different field names.
 */

function getParentQuoteId(info: any): string {
  return normalizeId(
    info?.ParentQuoteID ||
    info?.ParentQuoteId ||
    info?.parentQuoteId ||
    ""
  );
}


/*
 * Get Quote Number.
 */

function getQuoteNumber(info: any): string {
  return normalizeId(
    info?.QuoteNumber ||
    info?.quoteNumber ||
    ""
  );
}


/*
 * Get Quote ID.
 */

function getQuoteId(info: any): string {
  return normalizeId(
    info?.QuoteId ||
    info?.quoteId ||
    ""
  );
}


function normalizeQuoteForReport(data: any): any {
  const info = data?.QuoteInfo?.[0] || {};

  const qlines = Array.isArray(info?.Qlines)
    ? info.Qlines.map((line: any) => ({
        ...line,

        ProductName:
          line?.ProductName ??
          line?.productName ??
          "",

        Quantity:
          line?.Quantity ??
          line?.quantity ??
          "",

        UnitPrice:
          line?.UnitPrice ??
          line?.unitPrice ??
          line?.QuotedPrice ??
          line?.quotedPrice ??
          line?.Price ??
          line?.price ??
          "",

        QuotedPrice:
          line?.QuotedPrice ??
          line?.quotedPrice ??
          line?.UnitPrice ??
          line?.unitPrice ??
          line?.Price ??
          line?.price ??
          "",

        specValue:
          line?.specValue ??
          line?.SpecValue ??
          line?.Specification ??
          line?.specification ??
          "",
      }))
    : [];

  return {
    ...data,
    QuoteInfo: [
      {
        ...info,
        Qlines: qlines,
      },
    ],
  };
}

/* ============================================================
   POST /api/report
   ============================================================ */

export async function POST(req: Request) {

  try {

    /* ==========================================================
       READ REQUEST
       ========================================================== */

    const body = await req.json();

    const {
      quoteId,
      quoteNumber,
    } = body;


    console.log(
      "===================================="
    );

    console.log(
      "REPORT REQUEST"
    );

    console.log(
      "INPUT QUOTE ID:",
      quoteId
    );

    console.log(
      "INPUT QUOTE NUMBER:",
      quoteNumber
    );


    /* ==========================================================
       VALIDATE INPUT
       ========================================================== */

    if (!quoteId && !quoteNumber) {

      return NextResponse.json(
        {
          success: false,
          message: "quoteId or quoteNumber is required",
        },
        {
          status: 400,
        }
      );

    }


    /* ==========================================================
       GET ALL QUOTES
       ========================================================== */

   /* ==========================================================
   GET ALL QUOTES FROM BOTH COLLECTIONS
   ========================================================== */

const quotesSnapshot =
  await adminDb
    .collection("quotes")
    .get();

const quotessSnapshot =
  await adminDb
    .collection("quotess")
    .get();

const allQuoteDocs = [
  ...quotesSnapshot.docs,
  ...quotessSnapshot.docs,
];


console.log(
  "QUOTES COLLECTION:",
  quotesSnapshot.size
);

console.log(
  "QUOTESS COLLECTION:",
  quotessSnapshot.size
);

console.log(
  "TOTAL QUOTES FOUND:",
  allQuoteDocs.length
);


    /* ==========================================================
       FIND SELECTED QUOTE
       ========================================================== */

    let selectedQuote: any = null;

    let selectedQuoteDocId = "";


   for (const doc of allQuoteDocs) {

     const rawData = doc.data();
const data = normalizeQuoteForReport(rawData);

      const info = data?.QuoteInfo?.[0];

      if (!info) {
        continue;
      }


      const actualQuoteId =
        getQuoteId(info);

      const actualQuoteNumber =
        getQuoteNumber(info);


      const requestedQuoteId =
        normalizeId(quoteId);

      const requestedQuoteNumber =
        normalizeId(quoteNumber);


      const matchesQuoteId =
        Boolean(requestedQuoteId) &&
        actualQuoteId === requestedQuoteId;


      const matchesQuoteNumber =
        Boolean(requestedQuoteNumber) &&
        actualQuoteNumber === requestedQuoteNumber;


      if (
        matchesQuoteId ||
        matchesQuoteNumber
      ) {

        selectedQuote = data;

        selectedQuoteDocId = doc.id;


        console.log(
          "SELECTED QUOTE FOUND:",
          doc.id
        );

        break;

      }

    }


    /* ==========================================================
       QUOTE NOT FOUND
       ========================================================== */

    if (!selectedQuote) {

      console.error(
        "QUOTE NOT FOUND:",
        {
          quoteId,
          quoteNumber,
        }
      );


      return NextResponse.json(
        {
          success: false,
          message: "Quote not found",
        },
        {
          status: 404,
        }
      );

    }


    /* ==========================================================
       SELECTED QUOTE INFORMATION
       ========================================================== */

    const selectedInfo =
      selectedQuote?.QuoteInfo?.[0] || {};


    const quoteType =
      normalize(
        selectedInfo?.QuoteType
      );


    const selectedQuoteId =
      getQuoteId(selectedInfo);

    const selectedQuoteNumber =
      getQuoteNumber(selectedInfo);


    console.log(
      "SELECTED QUOTE DOC ID:",
      selectedQuoteDocId
    );

    console.log(
      "SELECTED QUOTE ID:",
      selectedQuoteId
    );

    console.log(
      "SELECTED QUOTE NUMBER:",
      selectedQuoteNumber
    );

    console.log(
      "SELECTED QUOTE TYPE:",
      selectedInfo?.QuoteType
    );

    console.log(
      "SELECTED VENDOR:",
      selectedInfo?.VendorName
    );


    /* ==========================================================
       FIND MASTER QUOTE
       ========================================================== */

    let masterQuote: any = null;


    /* ==========================================================
       CASE 1:
       SELECTED QUOTE IS MASTER
       ========================================================== */

    if (quoteType === "master") {

      masterQuote = selectedQuote;


      console.log(
        "SELECTED QUOTE IS MASTER QUOTE"
      );

    }


    /* ==========================================================
       CASE 2:
       SELECTED QUOTE IS TRANSACTIONAL
       ========================================================== */

    else {

      const parentQuoteId =
        getParentQuoteId(
          selectedInfo
        );


      console.log(
        "PARENT QUOTE ID:",
        parentQuoteId
      );


      if (parentQuoteId) {

       for (const doc of allQuoteDocs) {

         const rawData = doc.data();
const data = normalizeQuoteForReport(rawData);

          const info =
            data?.QuoteInfo?.[0];

          if (!info) {
            continue;
          }


          const actualMasterQuoteId =
            getQuoteId(info);


          const parentQuoteType =
            normalize(
              info?.QuoteType
            );


          if (
            actualMasterQuoteId ===
              parentQuoteId &&
            parentQuoteType === "master"
          ) {

            masterQuote = data;


            console.log(
              "MASTER QUOTE FOUND:",
              doc.id
            );

            break;

          }

        }

      }

    }


    /* ==========================================================
       MASTER QUOTE NOT FOUND
       ========================================================== */

    if (!masterQuote) {

      console.error(
        "MASTER QUOTE NOT FOUND"
      );


      return NextResponse.json(
        {
          success: false,
          message:
            "Parent Master Quote not found for this quote.",
        },
        {
          status: 404,
        }
      );

    }


    /* ==========================================================
       MASTER QUOTE INFORMATION
       ========================================================== */

    const masterInfo =
      masterQuote?.QuoteInfo?.[0] || {};


    const masterQuoteId =
      getQuoteId(masterInfo);

    const masterQuoteNumber =
      getQuoteNumber(masterInfo);


    console.log(
      "MASTER QUOTE NUMBER:",
      masterQuoteNumber
    );

    console.log(
      "MASTER QUOTE ID:",
      masterQuoteId
    );

    console.log(
      "MASTER QUOTE TYPE:",
      masterInfo?.QuoteType
    );


    /* ==========================================================
       GENERATE PROCUREMENT REPORT
       ========================================================== */

    let procurement: any;


    /* ==========================================================
       MASTER QUOTE REPORT
       ========================================================== */

    if (quoteType === "master") {

      console.log(
        "===================================="
      );

      console.log(
        "GENERATING MASTER QUOTE REPORT"
      );

      console.log(
        "===================================="
      );


      /*
       * Start with the selected Master quote.
       */

      const analysisQuotes: any[] = [
        masterQuote,
      ];


      /*
       * Keep track of vendor quotes already added.
       */

      const addedQuoteIds =
        new Set<string>();


      /*
       * Add every transactional quote that belongs
       * to this Master quote.
       */

    for (const doc of allQuoteDocs) {

       const rawData = doc.data();
const data = normalizeQuoteForReport(rawData);

        const info =
          data?.QuoteInfo?.[0];

        if (!info) {
          continue;
        }


        /*
         * Ignore Master quotes.
         */

        if (
          normalize(
            info?.QuoteType
          ) === "master"
        ) {
          continue;
        }


        const parentQuoteId =
          getParentQuoteId(info);


        /*
         * Only include vendor quotes belonging
         * to the selected Master quote.
         */

        if (
          parentQuoteId !==
          masterQuoteId
        ) {
          continue;
        }


        const currentQuoteId =
          getQuoteId(info);


        /*
         * Prevent duplicate vendor quotes.
         */

        if (
          currentQuoteId &&
          addedQuoteIds.has(currentQuoteId)
        ) {
          continue;
        }


        if (currentQuoteId) {

          addedQuoteIds.add(
            currentQuoteId
          );

        }


        analysisQuotes.push(
          data
        );

      }


      console.log(
        "MASTER QUOTE:",
        masterQuoteNumber
      );

      console.log(
        "MASTER QUOTE ID:",
        masterQuoteId
      );

      console.log(
        "VENDOR QUOTES FOUND:",
        analysisQuotes
          .filter(
            (quote: any) =>
              normalize(
                quote
                  ?.QuoteInfo?.[0]
                  ?.QuoteType
              ) !== "master"
          )
          .map(
            (quote: any) => {

              const info =
                quote?.QuoteInfo?.[0] || {};


              return {

                quoteNumber:
                  getQuoteNumber(info),

                vendor:
                  info?.VendorName,

                quoteId:
                  getQuoteId(info),

                parentQuoteId:
                  getParentQuoteId(info),

                productCount:
                  Array.isArray(
                    info?.Qlines
                  )
                    ? info.Qlines.length
                    : 0,

              };

            }
          )
      );


     /**
 * Generate Master Quote report.
 *
 * The report receives all transactional/vendor quotes
 * belonging to the selected Master Quote.
 *
 * The report generator deterministically selects
 * the Top 3 child quotes for comparison.
 */

      procurement =
        generateMasterQuoteReport(
          analysisQuotes,
          masterQuote
        );

    }


    /* ==========================================================
       TRANSACTIONAL QUOTE REPORT
       ========================================================== */

    else {

      console.log(
        "===================================="
      );

      console.log(
        "GENERATING TRANSACTIONAL QUOTE REPORT"
      );

      console.log(
        "===================================="
      );


      /*
       * Compare the selected vendor quote
       * against its parent Master quote.
       */

      procurement =
        generateTransactionalQuoteReport(
          masterQuote,
          selectedQuote
        );

    }


    /* ==========================================================
       LOG PROCUREMENT REPORT
       ========================================================== */

    console.log(
      "===================================="
    );

    console.log(
      "PROCUREMENT REPORT GENERATED"
    );

    console.log(
      "===================================="
    );


    console.log(
      JSON.stringify(
        procurement,
        null,
        2
      )
    );


    /* ==========================================================
       GEMINI PROCUREMENT AI ANALYSIS
       ========================================================== */

    let aiAnalysis: any = null;


    try {

      console.log(
        "===================================="
      );

      console.log(
        "STARTING GEMINI PROCUREMENT ANALYSIS"
      );

      console.log(
        "===================================="
      );


      /*
       * Send the deterministic report to the
       * Procurement Agent.
       */

      aiAnalysis =
        await runProcurementAgent(
          procurement
        );


      console.log(
        "===================================="
      );

      console.log(
        "AI PROCUREMENT ANALYSIS SUCCESS"
      );

      console.log(
        "===================================="
      );


      console.log(
        JSON.stringify(
          aiAnalysis,
          null,
          2
        )
      );

    } catch (error) {

      console.error(
        "===================================="
      );

      console.error(
        "AI PROCUREMENT ANALYSIS ERROR"
      );

      console.error(
        error
      );

      console.error(
        "===================================="
      );


      /*
       * The deterministic report is still returned
       * if Gemini fails.
       */

      aiAnalysis = {

        executiveRecommendation:
          "AI analysis unavailable. The procurement report was generated using deterministic procurement calculations.",

        overallAssessment:
          "The procurement data and comparison calculations are available, but Gemini could not generate the AI analysis.",

        recommendedVendors: [],

        productRecommendations: [],

        risks: [
          "AI analysis unavailable because the AI service could not generate the procurement analysis.",
        ],

        opportunities: [],

        insights: [],

        procurementActions: [
          "Review the deterministic procurement report before making purchasing decisions.",
        ],

      };

    }


    /* ==========================================================
       FINAL REPORT
       ========================================================== */

    const finalReport = {

      ...procurement,

      aiAnalysis,

    };


    console.log(
      "===================================="
    );

    console.log(
      "FINAL REPORT RESPONSE READY"
    );

    console.log(
      "===================================="
    );


    return NextResponse.json({

      success: true,

      report:
        finalReport,

    });

  } catch (error) {

    console.error(
      "===================================="
    );

    console.error(
      "REPORT API ERROR"
    );

    console.error(
      error
    );

    console.error(
      "===================================="
    );


    return NextResponse.json(
      {
        success: false,
        message: "Server Error",
      },
      {
        status: 500,
      }
    );

  }

}