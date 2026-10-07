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


  const masterVendors = isMasterQuote
  ? Array.isArray(reportData?.vendorsCompared)
    ? reportData.vendorsCompared
    : []
  : [];

  /*
   * ============================================================
   * PDF DOWNLOAD
   * ============================================================
   */
  const downloadPDF = () => {
   const doc = new jsPDF({
  orientation: isMasterQuote ? "landscape" : "portrait",
  unit: "mm",
  format: "a4",
});

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
  reportData.bestCombinedVendorCost ??
  reportData.totalAmount ??
  0
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
          "Master Specification",
          "Master Qty",
          "Target Price",
          ...masterVendors.map(
            (vendor: any, index: number) =>
              vendor?.vendor ??
              vendor?.vendorName ??
              `Vendor ${index + 1}`
          ),
          "Recommendation",
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
    ? (reportData.products ?? []).map((item: any) => {
        const vendors = Array.isArray(item?.vendors)
          ? item.vendors
          : [];

        const getVendorForColumn = (columnVendor: any) => {
          const columnQuoteId =
            columnVendor?.quoteId ?? "";

          const columnVendorName =
            columnVendor?.vendor ??
            columnVendor?.vendorName ??
            "";

          return vendors.find((vendor: any) => {
            const vendorQuoteId =
              vendor?.quoteId ?? "";

            const vendorName =
              vendor?.vendor ??
              vendor?.vendorName ??
              "";

            // Prefer Quote ID because it uniquely
            // identifies the transactional quote.
            if (
              columnQuoteId &&
              vendorQuoteId
            ) {
              return (
                columnQuoteId ===
                vendorQuoteId
              );
            }

            return (
              String(vendorName)
                .trim()
                .toLowerCase() ===
              String(columnVendorName)
                .trim()
                .toLowerCase()
            );
          });
        };

        const vendorCells = masterVendors.map(
          (columnVendor: any) => {
            const vendor =
              getVendorForColumn(columnVendor);

            if (!vendor) {
              return "Not Quoted";
            }

            const quantity =
              vendor?.quantity ??
              vendor?.addressedQty ??
              null;

            const price =
              vendor?.vendorPrice ??
              vendor?.unitPrice ??
              vendor?.UnitPrice ??
              null;

            const priceDifference =
              vendor?.priceDifference;

            const specificationMatch =
              vendor?.specificationMatch;

            const quantityMatch =
              vendor?.quantityMatch;

            const recommendation =
              vendor?.recommendation ??
              "Not Available";

            const quote =
              vendor?.quoteNumber ??
              vendor?.quoteId ??
              "N/A";

            const qtyText =
              quantity !== null &&
              quantity !== undefined &&
              quantity !== ""
                ? `Qty: ${quantity}`
                : "Qty: Missing";

            const priceText =
              price !== null &&
              price !== undefined &&
              price !== ""
                ? `Price: $${Number(price).toFixed(2)}`
                : "Price: Missing";

            const differenceText =
              priceDifference !== null &&
              priceDifference !== undefined
                ? `Difference: ${
                    Number(priceDifference) > 0
                      ? "+"
                      : ""
                  }$${Number(
                    priceDifference
                  ).toFixed(2)}`
                : "Difference: N/A";

            const specText =
              specificationMatch === true
                ? "Spec: Match"
                : "Spec: Mismatch";

            const quantityText =
              quantityMatch === true
                ? "Quantity: Match"
                : quantity !== null &&
                  quantity !== undefined &&
                  quantity !== ""
                ? "Quantity: Insufficient"
                : "Quantity: Missing";

            return [
              `Quote: ${quote}`,
              qtyText,
              priceText,
              differenceText,
              specText,
              quantityText,
              `Recommendation: ${recommendation}`,
            ].join("\n");
          }
        );

        return [
          item?.productName ?? "N/A",

          item?.specification ??
            item?.specValue ??
            "NA",

          item?.requestedQty ??
            item?.quantity ??
            "N/A",

          item?.targetPrice !== null &&
          item?.targetPrice !== undefined
            ? `$${Number(
                item.targetPrice
              ).toFixed(2)}`
            : "N/A",

          ...vendorCells,

          item?.recommendation ??
            "Not Available",
        ];
      })
    : (reportData.products ?? []).map(
        (item: any) => [
          item.productName ?? "N/A",
          item.remarks ?? "N/A",
          item.recommendation ??
            "Not Available",
        ]
      ),

  styles: {
    fontSize: 7,
    cellPadding: 3,
    valign: "top",
  },

  headStyles: {
    fontSize: 7,
    valign: "middle",
  },

  columnStyles: isMasterQuote
    ? {
        0: { cellWidth: 28 },
        1: { cellWidth: 32 },
        2: { cellWidth: 16 },
        3: { cellWidth: 20 },
        [4 + masterVendors.length]: {
          cellWidth: 24,
        },
      }
    : {},

  margin: {
    left: 8,
    right: 8,
  },

  theme: "grid",
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
             Master Quote — Vendor Comparison
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
  reportData.bestCombinedVendorCost ??
  reportData.totalAmount ??
  0
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
            ? "Master Quote — Vendor Comparison"
            : "Procurement Analysis"}
        </h3>

      {isMasterQuote ? (
  /*
   * ======================================================
   * MASTER QUOTE DISPLAY
   * ======================================================
   *
   * One row = one Master Quote product.
   * One dynamic column = one transactional vendor.
   *
   * Master Quote is the source of truth.
   */
  <table className="w-full border-collapse min-w-[1400px]">
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

        {masterVendors.map(
          (vendor: any, vendorIndex: number) => (
            <th
              key={`vendor-header-${vendorIndex}`}
              className="p-2 text-left min-w-[220px]"
            >
              {vendor?.vendor ??
                vendor?.vendorName ??
                `Vendor ${vendorIndex + 1}`}
            </th>
          )
        )}

        <th className="p-2 text-left">
          Recommendation
        </th>
      </tr>
    </thead>

    <tbody>
      {(reportData.products ?? []).map(
        (
          item: any,
          productIndex: number
        ) => {
          const vendors = Array.isArray(
            item?.vendors
          )
            ? item.vendors
            : [];

          /*
           * Find the vendor data for a particular
           * vendor column.
           */
          const getVendorForColumn = (
            columnVendor: any
          ) => {
            const columnQuoteId =
              columnVendor?.quoteId ??
              "";

            const columnVendorName =
              columnVendor?.vendor ??
              columnVendor?.vendorName ??
              "";

            return vendors.find(
              (vendor: any) => {
                const vendorQuoteId =
                  vendor?.quoteId ??
                  "";

                const vendorName =
                  vendor?.vendor ??
                  vendor?.vendorName ??
                  "";

                /*
                 * Prefer Quote ID because it uniquely
                 * identifies the transactional quote.
                 */
                if (
                  columnQuoteId &&
                  vendorQuoteId
                ) {
                  return (
                    columnQuoteId ===
                    vendorQuoteId
                  );
                }

                return (
                  String(vendorName)
                    .trim()
                    .toLowerCase() ===
                  String(columnVendorName)
                    .trim()
                    .toLowerCase()
                );
              }
            );
          };

          return (
            <tr
              key={`product-${productIndex}`}
              className="border-b border-slate-800 hover:bg-slate-800/50"
            >
              {/* MASTER PRODUCT */}
              <td className="p-2 font-medium">
                {item?.productName ??
                  "N/A"}
              </td>

              {/* MASTER SPECIFICATION */}
              <td className="p-2 text-sm text-slate-300">
                {item?.specification ??
                  item?.specValue ??
                  "NA"}
              </td>

              {/* MASTER REQUESTED QUANTITY */}
              <td className="p-2">
                {item?.requestedQty ??
                  item?.quantity ??
                  "N/A"}
              </td>

              {/* MASTER TARGET PRICE */}
              <td className="p-2">
                {item?.targetPrice !==
                  null &&
                item?.targetPrice !==
                  undefined
                  ? `$${Number(
                      item.targetPrice
                    ).toFixed(2)}`
                  : "N/A"}
              </td>

              {/* ==================================================
                  DYNAMIC VENDOR COLUMNS
                 ================================================== */}
              {masterVendors.map(
                (
                  columnVendor: any,
                  vendorIndex: number
                ) => {
                  const vendor =
                    getVendorForColumn(
                      columnVendor
                    );

                  /*
                   * Vendor did not quote this
                   * Master product.
                   */
                  if (!vendor) {
                    return (
                      <td
                        key={`vendor-cell-${productIndex}-${vendorIndex}`}
                        className="p-2"
                      >
                        <span className="text-red-400">
                          Not Quoted
                        </span>
                      </td>
                    );
                  }

                  const vendorQuantity =
                    vendor?.quantity ??
                    vendor?.addressedQty ??
                    null;

                  const vendorPrice =
                    vendor?.vendorPrice ??
                    vendor?.unitPrice ??
                    vendor?.UnitPrice ??
                    null;

                  const hasQuantity =
                    vendorQuantity !==
                      null &&
                    vendorQuantity !==
                      undefined &&
                    vendorQuantity !== "";

                  const hasPrice =
                    vendorPrice !==
                      null &&
                    vendorPrice !==
                      undefined &&
                    vendorPrice !== "";

                  const specificationMatch =
                    vendor?.specificationMatch;

                  const quantityMatch =
                    vendor?.quantityMatch;

                  const priceDifference =
                    vendor?.priceDifference;

                  const recommendation =
                    vendor?.recommendation ??
                    "Not Available";

                  return (
                    <td
                      key={`vendor-cell-${productIndex}-${vendorIndex}`}
                      className="p-2 align-top"
                    >
                      <div className="space-y-1">
                        {/* QUOTE NUMBER */}
                        <div className="text-blue-300 font-medium">
                          Quote:{" "}
                          {vendor?.quoteNumber ??
                            vendor?.quoteId ??
                            "N/A"}
                        </div>

                        {/* QUANTITY */}
                        <div>
                          Qty:{" "}
                          {hasQuantity
                            ? vendorQuantity
                            : "Missing"}
                        </div>

                        {/* PRICE */}
                        <div>
                          Price:{" "}
                          {hasPrice
                            ? `$${Number(
                                vendorPrice
                              ).toFixed(2)}`
                            : "Missing"}
                        </div>

                        {/* PRICE DIFFERENCE */}
                        <div>
                          Difference:{" "}
                          {priceDifference !==
                            null &&
                          priceDifference !==
                            undefined
                            ? `${
                                Number(
                                  priceDifference
                                ) > 0
                                  ? "+"
                                  : ""
                              }$${Number(
                                priceDifference
                              ).toFixed(2)}`
                            : "N/A"}
                        </div>

                        {/* SPECIFICATION */}
                        <div>
                          Spec:{" "}
                          {specificationMatch ===
                          true ? (
                            <span className="text-green-400">
                              Match
                            </span>
                          ) : (
                            <span className="text-red-400">
                              Mismatch
                            </span>
                          )}
                        </div>

                        {/* QUANTITY STATUS */}
                        <div>
                          Quantity:{" "}
                          {quantityMatch ===
                          true ? (
                            <span className="text-green-400">
                              Match
                            </span>
                          ) : hasQuantity ? (
                            <span className="text-red-400">
                              Insufficient
                            </span>
                          ) : (
                            <span className="text-yellow-400">
                              Missing
                            </span>
                          )}
                        </div>

                        {/* RECOMMENDATION */}
                        <div className="font-semibold">
                          {recommendation ===
                          "Recommended" ? (
                            <span className="text-green-400">
                              Recommended
                            </span>
                          ) : (
                            <span className="text-yellow-400">
                              {recommendation}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                }
              )}

              {/* PRODUCT-LEVEL RECOMMENDATION */}
              <td className="p-2 font-semibold">
                {item?.recommendation ===
                "Recommended" ? (
                  <span className="text-green-400">
                    Recommended
                  </span>
                ) : (
                  <span className="text-yellow-400">
                    {item?.recommendation ??
                      "Not Available"}
                  </span>
                )}
              </td>
            </tr>
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