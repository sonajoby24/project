"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface DashboardProps {
  reportData: any;
}

export default function ProcurementDashboard({
  reportData,
}: DashboardProps) {
  /*
   * ============================================================
   * REPORT TYPE
   * ============================================================
   *
   * Master Quote:
   *   Display the individual transactional child quotes
   *   stored inside product.vendors[].
   *
   * Transactional Quote:
   *   Keep the existing single-vendor display.
   */
  const isMasterQuote =
    String(
      reportData?.selectedQuoteType ??
        reportData?.quoteType ??
        ""
    )
      .trim()
      .toLowerCase() === "master";

  /*
   * ============================================================
   * PDF DOWNLOAD
   * ============================================================
   */
  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Catalogix Procurement Report", 14, 20);

    doc.setFontSize(12);

    doc.text(
      `Quote ID: ${reportData.quoteId ?? reportData.inputQuoteId ?? "N/A"}`,
      14,
      35
    );

    doc.text(
      `Quote Name: ${
        reportData.quoteName ??
        reportData.selectedQuoteName ??
        "N/A"
      }`,
      14,
      45
    );

    doc.text(
      `Quote Type: ${
        reportData.selectedQuoteType ??
        reportData.quoteType ??
        "N/A"
      }`,
      14,
      55
    );

    doc.text(
      `Total Products: ${reportData.totalProducts ?? 0}`,
      14,
      65
    );

    doc.text(
      `Total Amount: $ ${Number(
        reportData.totalAmount ?? 0
      ).toFixed(2)}`,
      14,
      75
    );

    doc.text("Executive Summary", 14, 90);

    doc.text(
      `Quantity Compliance: ${
        reportData.qtyMatchPercentage ?? 0
      }%`,
      14,
      100
    );

    doc.text(
      `Pricing Compliance: ${
        reportData.overallPriceMatchPercentage ?? 0
      }%`,
      14,
      110
    );

    doc.text(
      `Missing Products: ${
        reportData.missingProductCount ?? 0
      }`,
      14,
      120
    );

    doc.text(
      `Extra Products: ${
        reportData.extraProductCount ?? 0
      }`,
      14,
      130
    );

    /*
     * ============================================================
     * PDF PROCUREMENT TABLE
     * ============================================================
     */
    autoTable(doc, {
      startY: 145,
      head: isMasterQuote
        ? [
            [
              "Product",
              "Master Qty",
              "Target Price",
              "Quote",
              "Vendor",
              "Quote Qty",
              "Unit Price",
              "Price Difference",
              "Status",
            ],
          ]
        : [
            [
              "Product",
              "Qty Status",
              "Recommendation",
            ],
          ],

      body: isMasterQuote
        ? (reportData.products ?? []).flatMap(
            (item: any) => {
              const vendors = Array.isArray(item?.vendors)
                ? item.vendors
                : [];

              return vendors.map((vendor: any) => [
                item.productName ?? "N/A",
                item.requestedQty ??
                  item.quantity ??
                  "N/A",
                item.targetPrice !== null &&
                item.targetPrice !== undefined
                  ? `$${Number(
                      item.targetPrice
                    ).toFixed(2)}`
                  : "N/A",
                vendor.quoteNumber ??
                  vendor.quoteId ??
                  "N/A",
                vendor.vendorName ??
                  vendor.vendor ??
                  "N/A",
                vendor.quantity !== null &&
                vendor.quantity !== undefined
                  ? vendor.quantity
                  : "Quantity Missing",
                vendor.vendorPrice !== null &&
                vendor.vendorPrice !== undefined
                  ? `$${Number(
                      vendor.vendorPrice
                    ).toFixed(2)}`
                  : "N/A",
                vendor.priceDifference !== null &&
                vendor.priceDifference !== undefined
                  ? `${
                      Number(
                        vendor.priceDifference
                      ) > 0
                        ? "+"
                        : ""
                    }$${Number(
                      vendor.priceDifference
                    ).toFixed(2)}`
                  : "N/A",
                vendor.recommendation ??
                  "Not Available",
              ]);
            }
          )
        : (reportData.products ?? []).map(
            (item: any) => [
              item.productName ?? "N/A",
              item.remarks ?? "N/A",
              item.recommendation ??
                "Not Available",
            ]
          ),
    });

    doc.save(
      `Procurement_Report_${
        reportData.quoteNumber ??
        reportData.selectedQuoteNumber ??
        "report"
      }.pdf`
    );
  };

  /*
   * ============================================================
   * EMPTY STATE
   * ============================================================
   */
  if (!reportData) {
    return (
      <div className="bg-slate-900 p-6 rounded-xl mb-8">
        <h2 className="text-3xl font-bold mb-4">
          Procurement Dashboard
        </h2>

        <p className="text-zinc-400">
          Generate a report from chat to view dashboard
          analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mb-10">
      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">
            Procurement Dashboard
          </h2>

          {isMasterQuote && (
            <p className="text-sm text-slate-400 mt-1">
              Master Quote — Top 3 Transactional Quotes
            </p>
          )}
        </div>

        <button
          onClick={downloadPDF}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white"
        >
          Download PDF
        </button>
      </div>

      {/* ========================================================
          SUMMARY CARDS
      ======================================================== */}

      <div className="grid md:grid-cols-7 gap-4">
        <div className="bg-slate-800 p-5 rounded-xl">
          <h3>Total Products</h3>

          <p className="text-3xl font-bold">
            {reportData.totalProducts ?? 0}
          </p>
        </div>

        <div className="bg-green-800 p-5 rounded-xl">
          <h3>Best Combined Cost</h3>

          <p className="text-3xl font-bold">
            $
            {Number(
              reportData.totalAmount ?? 0
            ).toFixed(2)}
          </p>
        </div>

        <div className="bg-yellow-700 p-5 rounded-xl">
          <h3>Qty Match %</h3>

          <p className="text-3xl font-bold">
            {reportData.qtyMatchPercentage ?? 0}%
          </p>
        </div>

        <div className="bg-blue-700 p-5 rounded-xl">
          <h3>Price Match %</h3>

          <p className="text-3xl font-bold">
            {reportData.overallPriceMatchPercentage ??
              0}
            %
          </p>
        </div>

        <div className="bg-red-700 p-5 rounded-xl">
          <h3>Missing Products</h3>

          <p className="text-3xl font-bold">
            {reportData.missingProductCount ?? 0}
          </p>
        </div>

        <div className="bg-orange-700 p-5 rounded-xl">
          <h3>Extra Products</h3>

          <p className="text-3xl font-bold">
            {reportData.extraProductCount ?? 0}
          </p>
        </div>

        <div className="bg-purple-700 p-5 rounded-xl">
          <h3>Wrong Specs</h3>

        <p className="text-3xl font-bold">
  {isMasterQuote
    ? (reportData.products ?? []).filter(
        (item: any) =>
          Array.isArray(item?.vendors) &&
          item.vendors.some(
            (vendor: any) =>
              vendor?.specificationMatch === false ||
              String(
                vendor?.recommendation ?? ""
              )
                .trim()
                .toLowerCase() ===
                "specification mismatch"
          )
      ).length
    : (reportData.products ?? []).filter(
        (p: any) =>
          p?.specificationMatch === false ||
          String(
            p?.specificationStatus ??
              p?.specStatus ??
              ""
          )
            .trim()
            .toLowerCase() ===
            "specification mismatch"
      ).length}
</p>

        </div>
      </div>

      {/* ========================================================
          PROCUREMENT ANALYSIS
      ======================================================== */}

      <div className="bg-slate-900 p-6 rounded-xl overflow-x-auto">
        <h3 className="text-xl font-bold mb-4">
          {isMasterQuote
            ? "Master Quote — Top 3 Transactional Quote Comparison"
            : "Procurement Analysis"}
        </h3>

        {isMasterQuote ? (
          /*
           * ======================================================
           * MASTER QUOTE DISPLAY
           * ======================================================
           *
           * IMPORTANT:
           *
           * masterQuoteReport.ts already gives us:
           *
           * product.vendors[]
           *
           * Each vendor entry represents an individual
           * transactional child quote.
           *
           * Therefore we display those entries directly.
           */
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="p-2 text-left">
                  Product
                </th>

                <th className="p-2 text-left">
                  Master Specification
                </th>

                <th className="p-2 text-left">
                  Requested Qty
                </th>

                <th className="p-2 text-left">
                  Target Price
                </th>

                <th className="p-2 text-left">
                  Transactional Quote
                </th>

                <th className="p-2 text-left">
                  Vendor
                </th>

                <th className="p-2 text-left">
                  Quote Qty
                </th>

                <th className="p-2 text-left">
                  Unit Price
                </th>

                <th className="p-2 text-left">
                  Price Difference
                </th>

                <th className="p-2 text-left">
                  Specification
                </th>

                <th className="p-2 text-left">
                  Recommendation
                </th>
              </tr>
            </thead>

            <tbody>
              {(reportData.products ?? []).map(
                (
                  item: any,
                  index: number
                ) => {
                  /*
                   * Child transactional quotes selected by
                   * masterQuoteReport.ts.
                   */
                  const vendors = Array.isArray(
                    item?.vendors
                  )
                    ? item.vendors
                    : [];

                  /*
                   * If there are no vendor entries for this
                   * product, show that explicitly.
                   */
                  if (vendors.length === 0) {
                    return (
                      <tr
                        key={`missing-${index}`}
                        className="border-b border-slate-800"
                      >
                        <td className="p-2 font-medium">
                          {item.productName ??
                            "N/A"}
                        </td>

                        <td className="p-2 text-sm text-slate-300">
                          {item.specification ??
                            item.specValue ??
                            "NA"}
                        </td>

                        <td className="p-2">
                          {item.requestedQty ??
                            item.quantity ??
                            "N/A"}
                        </td>

                        <td className="p-2">
                          {item.targetPrice !==
                            null &&
                          item.targetPrice !==
                            undefined
                            ? `$${Number(
                                item.targetPrice
                              ).toFixed(2)}`
                            : "N/A"}
                        </td>

                        <td
                          className="p-2"
                          colSpan={6}
                        >
                          <span className="text-red-400">
                            No transactional quote
                            provided
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  /*
                   * One row per transactional quote.
                   */
                  return vendors.map(
                    (
                      vendor: any,
                      vendorIndex: number
                    ) => {
                      const vendorName =
                        vendor?.vendorName ??
                        vendor?.vendor ??
                        "N/A";

                      const quoteNumber =
                        vendor?.quoteNumber ??
                        vendor?.QuoteNumber ??
                        "N/A";

                      const quoteId =
                        vendor?.quoteId ??
                        vendor?.QuoteId ??
                        "";

                      const quoteDisplay =
                        quoteNumber !== "N/A"
                          ? quoteNumber
                          : quoteId || "N/A";

                      /*
                       * Quantity:
                       *
                       * If quantity is missing, explicitly
                       * display "Quantity Missing".
                       */
                      const vendorQuantity =
                        vendor?.quantity ??
                        vendor?.addressedQty ??
                        null;

                      const hasQuantity =
                        vendorQuantity !==
                          null &&
                        vendorQuantity !==
                          undefined &&
                        vendorQuantity !== "";

                      /*
                       * Unit price.
                       *
                       * Do not invent a price when quantity
                       * is missing.
                       */
                      const vendorPrice =
                        vendor?.vendorPrice ??
                        vendor?.unitPrice ??
                        vendor?.UnitPrice ??
                        null;

                      const hasPrice =
                        vendorPrice !==
                          null &&
                        vendorPrice !==
                          undefined &&
                        vendorPrice !== "";

                      /*
                       * Price difference comes from the
                       * deterministic backend.
                       */
                      const rawPriceDifference =
                        vendor?.priceDifference ??
                        vendor?.priceDiff ??
                        null;

                      const hasPriceDifference =
                        rawPriceDifference !==
                          null &&
                        rawPriceDifference !==
                          undefined &&
                        rawPriceDifference !== "";

                      /*
                       * Specification status.
                       */
                      const specificationMatch =
                        vendor?.specificationMatch;

                      const specificationStatus =
                        specificationMatch ===
                        true
                          ? "Match"
                          : specificationMatch ===
                            false
                          ? "Specification Mismatch"
                          : vendor?.recommendation ===
                            "Specification Mismatch"
                          ? "Specification Mismatch"
                          : "N/A";

                      /*
                       * Recommendation comes directly from
                       * masterQuoteReport.ts.
                       */
                      let recommendation =
                        vendor?.recommendation ??
                        "Not Available";

                      /*
                       * Quantity Missing must be visible
                       * regardless of recommendation.
                       */
                      if (!hasQuantity) {
                        recommendation =
                          "Quantity Missing";
                      }

                      return (
                        <tr
                          key={`${index}-${vendorIndex}`}
                          className="border-b border-slate-800 hover:bg-slate-800/50"
                        >
                          {/* PRODUCT FROM MASTER */}
                          <td className="p-2 font-medium">
                            {item.productName ??
                              "N/A"}
                          </td>

                          {/* MASTER SPECIFICATION */}
                          <td className="p-2 text-sm text-slate-300">
                            {item.specification ??
                              item.specValue ??
                              "NA"}
                          </td>

                          {/* MASTER REQUESTED QTY */}
                          <td className="p-2">
                            {item.requestedQty ??
                              item.quantity ??
                              "N/A"}
                          </td>

                          {/* MASTER TARGET PRICE */}
                          <td className="p-2">
                            {item.targetPrice !==
                              null &&
                            item.targetPrice !==
                              undefined
                              ? `$${Number(
                                  item.targetPrice
                                ).toFixed(2)}`
                              : "N/A"}
                          </td>

                          {/* TRANSACTIONAL QUOTE */}
                          <td className="p-2 font-medium text-blue-300">
                            {quoteDisplay}
                          </td>

                          {/* VENDOR */}
                          <td className="p-2">
                            {vendorName}
                          </td>

                          {/* QUOTE QUANTITY */}
                          <td className="p-2">
                            {hasQuantity ? (
                              vendorQuantity
                            ) : (
                              <span className="text-yellow-400">
                                Quantity Missing
                              </span>
                            )}
                          </td>

                          {/* UNIT PRICE */}
                          <td className="p-2">
                            {hasQuantity &&
                            hasPrice ? (
                              `$${Number(
                                vendorPrice
                              ).toFixed(2)}`
                            ) : !hasQuantity ? (
                              <span className="text-yellow-400">
                                Cannot Compare
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                Price Missing
                              </span>
                            )}
                          </td>

                          {/* PRICE DIFFERENCE */}
                          <td className="p-2">
                            {hasQuantity &&
                            hasPriceDifference ? (
                              <span
                                className={
                                  Number(
                                    rawPriceDifference
                                  ) <= 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                }
                              >
                                {Number(
                                  rawPriceDifference
                                ) > 0
                                  ? "+"
                                  : ""}
                                $
                                {Number(
                                  rawPriceDifference
                                ).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                N/A
                              </span>
                            )}
                          </td>

                          {/* SPECIFICATION */}
                          <td className="p-2">
                            {specificationStatus ===
                            "Match" ? (
                              <span className="text-green-400">
                                Match
                              </span>
                            ) : specificationStatus ===
                              "Specification Mismatch" ? (
                              <span className="text-red-400">
                                Specification
                                Mismatch
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                N/A
                              </span>
                            )}
                          </td>

                          {/* RECOMMENDATION */}
                          <td className="p-2">
                            <span
                              className={`px-3 py-1 rounded text-white ${
                                recommendation ===
                                "Recommended"
                                  ? "bg-green-600"
                                  : recommendation ===
                                    "Above Target"
                                  ? "bg-yellow-600"
                                  : recommendation ===
                                    "Quantity Missing"
                                  ? "bg-yellow-600"
                                  : recommendation ===
                                    "Insufficient Quantity"
                                  ? "bg-orange-600"
                                  : recommendation ===
                                    "Specification Mismatch"
                                  ? "bg-red-600"
                                  : "bg-red-600"
                              }`}
                            >
                              {recommendation}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  );
                }
              )}
            </tbody>
          </table>
        ) : (
          /*
           * ======================================================
           * TRANSACTIONAL QUOTE DISPLAY
           * ======================================================
           *
           * This remains separate from Master Quote logic.
           */
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="p-2 text-left">
                  Product
                </th>

                <th className="p-2 text-left">
                  Specification
                </th>

                <th className="p-2 text-left">
                  Requested Qty
                </th>

                <th className="p-2 text-left">
                  Target Price
                </th>

                <th className="p-2 text-left">
                  Vendor
                </th>

                <th className="p-2 text-left">
                  Addressed Qty
                </th>

                <th className="p-2 text-left">
                  Vendor Price
                </th>

                <th className="p-2 text-left">
                  Price Difference
                </th>

                <th className="p-2 text-left">
                  Specification Status
                </th>

                <th className="p-2 text-left">
                  Recommendation
                </th>
              </tr>
            </thead>

            <tbody>
              {(reportData.products ?? []).map(
                (
                  item: any,
                  index: number
                ) => {
                  const vendorName =
                    item.vendorName ??
                    item.vendor ??
                    item.bestVendorName ??
                    item.bestVendor ??
                    item.cheapestVendor ??
                    "";

                  const rawAddressedQty =
                    item.addressedQty ??
                    item.vendorAddressedQty ??
                    item.vendorQuantity ??
                    null;

                  const addressedQty =
                    rawAddressedQty !== null &&
                    rawAddressedQty !==
                      undefined &&
                    rawAddressedQty !== ""
                      ? Number(
                          rawAddressedQty
                        )
                      : null;

                  const rawVendorPrice =
                    item.vendorPrice ??
                    item.vendorUnitPrice ??
                    item.cheapestPrice ??
                    null;

                  const vendorPrice =
                    rawVendorPrice !== null &&
                    rawVendorPrice !==
                      undefined &&
                    rawVendorPrice !== ""
                      ? Number(
                          rawVendorPrice
                        )
                      : null;

                  const rawTargetPrice =
                    item.targetPrice ??
                    item.TargetPrice ??
                    null;

                  const targetPrice =
                    rawTargetPrice !== null &&
                    rawTargetPrice !==
                      undefined &&
                    rawTargetPrice !== ""
                      ? Number(
                          rawTargetPrice
                        )
                      : null;

                  const rawPriceDifference =
                    item.priceDifference ??
                    item.priceDiff ??
                    null;

                  const priceDifference =
                    rawPriceDifference !==
                      null &&
                    rawPriceDifference !==
                      undefined &&
                    rawPriceDifference !== ""
                      ? Number(
                          rawPriceDifference
                        )
                      : vendorPrice !==
                            null &&
                        targetPrice !== null
                      ? vendorPrice -
                        targetPrice
                      : null;

                  const specificationStatus =
                    item.specificationStatus ??
                    item.specStatus ??
                    item.specificationMatch ??
                    "";

                  const recommendation =
                    item.recommendation ??
                    "Not Available";

                  return (
                    <tr
                      key={index}
                      className="border-b border-slate-800"
                    >
                      <td className="p-2">
                        {item.productName ??
                          "N/A"}
                      </td>

                      <td className="p-2 text-sm text-slate-300">
                        {item.specification ??
                          item.specValue ??
                          "NA"}
                      </td>

                      <td className="p-2">
                        {item.requestedQty ??
                          item.quantity ??
                          0}
                      </td>

                      <td className="p-2">
                        {targetPrice !== null
                          ? `$${targetPrice.toFixed(
                              2
                            )}`
                          : "NA"}
                      </td>

                      <td className="p-2 font-medium">
                        {vendorName ? (
                          vendorName
                        ) : (
                          <span className="text-red-400">
                            No vendor quoted
                          </span>
                        )}
                      </td>

                      <td className="p-2">
                        {vendorName &&
                        addressedQty !==
                          null
                          ? addressedQty
                          : "NA"}
                      </td>

                      <td className="p-2">
                        {vendorName &&
                        vendorPrice !== null
                          ? `$${vendorPrice.toFixed(
                              2
                            )}`
                          : "NA"}
                      </td>

                      <td className="p-2">
                        {vendorName &&
                        priceDifference !==
                          null ? (
                          <span
                            className={
                              priceDifference <=
                              0
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {priceDifference >
                            0
                              ? "+"
                              : ""}
                            $
                            {priceDifference.toFixed(
                              2
                            )}
                          </span>
                        ) : (
                          "NA"
                        )}
                      </td>

                      <td className="p-2">
                        {String(
                          specificationStatus
                        ).toLowerCase() ===
                        "true" ? (
                          <span className="text-green-400">
                            Match
                          </span>
                        ) : specificationStatus ===
                          "Specification Match" ? (
                          <span className="text-green-400">
                            Match
                          </span>
                        ) : specificationStatus ? (
                          <span className="text-red-400">
                            {
                              specificationStatus
                            }
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            NA
                          </span>
                        )}
                      </td>

                      <td className="p-2">
                        <span
                          className={`px-3 py-1 rounded text-white ${
                            recommendation ===
                            "Recommended"
                              ? "bg-green-600"
                              : recommendation ===
                                "Above Target"
                              ? "bg-yellow-600"
                              : "bg-red-600"
                          }`}
                        >
                          {recommendation}
                        </span>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================================
          MISSING PRODUCTS
      ======================================================== */}

      <div className="bg-slate-900 p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-4">
          Missing Products
        </h3>

        {reportData.missingProducts?.length >
        0 ? (
          <ul className="space-y-2">
            {reportData.missingProducts.map(
              (
                item: any,
                index: number
              ) => (
                <li key={index}>
                  ❌ {item.productName} (
                  {item.specValue || "NA"})
                </li>
              )
            )}
          </ul>
        ) : (
          <p>No Missing Products</p>
        )}
      </div>

      {/* ========================================================
          EXTRA PRODUCTS
      ======================================================== */}

      <div className="bg-slate-900 p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-4">
          Extra Products
        </h3>

        {reportData.extraProducts?.length >
        0 ? (
          <ul className="space-y-2">
            {reportData.extraProducts.map(
              (
                item: any,
                index: number
              ) => (
                <li key={index}>
                  ⚠️ {item.productName} (
                  {item.specValue || "NA"}) -{" "}
                  <span className="text-yellow-400">
                    {item.vendor}
                  </span>
                </li>
              )
            )}
          </ul>
        ) : (
          <p>No Extra Products</p>
        )}
      </div>

      {/* ========================================================
          AI INSIGHTS
      ======================================================== */}

      <div className="bg-slate-900 p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-4">
          AI Procurement Insights
        </h3>

        <ul className="space-y-2">
          {reportData.insights?.map(
            (
              insight: string,
              index: number
            ) => (
              <li key={index}>
                ✅ {insight}
              </li>
            )
          )}
        </ul>
      </div>

      {/* ========================================================
          QUOTE DETAILS
      ======================================================== */}

      <div className="bg-slate-900 p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-4">
          Quote Details
        </h3>

        <div className="space-y-2">
          <h4 className="font-semibold text-lg text-blue-400">
            Selected Quote
          </h4>

          <p>
            Quote ID:{" "}
            {reportData.inputQuoteId ??
              reportData.quoteId ??
              "N/A"}
          </p>

          <p>
            Quote Number:{" "}
            {reportData.selectedQuoteNumber ??
              reportData.quoteNumber ??
              "N/A"}
          </p>

          <p>
            Quote Name:{" "}
            {reportData.selectedQuoteName ??
              reportData.quoteName ??
              "N/A"}
          </p>

          <p>
            Vendor:{" "}
            {reportData.selectedVendor ??
              "N/A"}
          </p>

          <p>
            Quote Type:{" "}
            {reportData.selectedQuoteType ??
              reportData.quoteType ??
              "N/A"}
          </p>

          <h4 className="font-semibold text-lg text-green-400 mt-6">
            Parent Master Quote
          </h4>

          <p>
            Master Quote ID:{" "}
            {reportData.parentQuoteId ??
              "N/A"}
          </p>

          <p>
            Master Quote Number:{" "}
            {reportData.parentQuoteNumber ??
              "N/A"}
          </p>

          <p>
            Master Quote Name:{" "}
            {reportData.parentQuoteName ??
              "N/A"}
          </p>

          <h4 className="font-semibold text-lg mt-6">
            Analysis Summary
          </h4>

          <p>
            Total Master Products:{" "}
            {reportData.totalProducts ?? 0}
          </p>

          <p>
            Best Combined Vendor Cost: $
            {Number(
              reportData.bestCombinedVendorCost ??
                reportData.totalAmount ??
                0
            ).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}