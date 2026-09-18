"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/*import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";*/

/*const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
];
*/
interface DashboardProps {
  reportData: any;
}

export default function ProcurementDashboard({
  reportData,
}: DashboardProps) {

  const downloadPDF = () => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Catalogix Procurement Report", 14, 20);

  doc.setFontSize(12);

  doc.text(
    `Quote ID: ${reportData.quoteId}`,
    14,
    35
  );

  doc.text(
    `Quote Name: ${reportData.quoteName}`,
    14,
    45
  );

  doc.text(
    `Total Products: ${reportData.totalProducts}`,
    14,
    55
  );

  doc.text(
    `Total Amount: $ ${reportData.totalAmount}`,
    14,
    65
  );
  
  doc.text("Executive Summary", 14, 90);

doc.text(
  `Quantity Compliance: ${reportData.qtyMatchPercentage}%`,
  14,
  100
);

doc.text(
  `Pricing Compliance: ${reportData.overallPriceMatchPercentage}%`,
  14,
  110
);

doc.text(
  `Missing Products: ${reportData.missingProductCount || 0}`,
  14,
  120
);

doc.text(
  `Extra Products: ${reportData.extraProductCount || 0}`,
  14,
  130
);
doc.text(
  `Recommendation: ${
    reportData.qtyMatchPercentage >= 80
      ? "Quote recommended for approval"
      : "Quote requires review"
  }`,
  14,
  140
);

doc.text(
  reportData.qtyMatchPercentage >= 80
    ? "This procurement quote satisfies most RFQ requirements and is recommended for approval."
    : "This procurement quote requires further review before approval.",
  14,
  155,
  { maxWidth: 180 }
);
doc.text("AI Procurement Insights", 14, 145);

doc.text(
  `• ${reportData.qtyMatchPercentage}% quantity compliance achieved`,
  14,
  155
);

doc.text(
  `• ${reportData.overallPriceMatchPercentage}% pricing compliance achieved`,
  14,
  165
);

doc.text(
  reportData.qtyMatchPercentage >= 80
    ? "This procurement quote satisfies most RFQ requirements..."
    : "This procurement quote requires further review...",
  14,
  155,
  { maxWidth: 180 }
);

  autoTable(doc, {
    startY: 220,
    head: [["Metric", "Value"]],
   body: [
  ["Qty Match %", reportData.qtyMatchPercentage],
  ["Price Match %", reportData.overallPriceMatchPercentage],
  ["Missing Products", reportData.missingProductCount || 0],
  ["Extra Products", reportData.extraProductCount || 0],
 [
  "Wrong Specs",
  reportData.products?.filter(
    (p: any) =>
      p?.specificationMatch === false ||
      String(
        p?.specificationStatus ??
        p?.specStatus ??
        ""
      ).trim().toLowerCase() ===
        "specification mismatch"
  ).length ?? 0,
],
],
  });

  autoTable(doc, {
    startY: 190,
    head: [
      [
        "Product",
        "Qty Status",
        "Recommendation",
      ],
    ],
    body: reportData.products.map(
      (item: any) => [
        item.productName,
        item.remarks,
        item.recommendation,
      ]
    ),
  });
  
  doc.save(
    `Procurement_Report_${reportData.quoteNumber}.pdf`
  );
};

  if (!reportData) {
    return (
      <div className="bg-slate-900 p-6 rounded-xl mb-8">
        <h2 className="text-3xl font-bold mb-4">
          Procurement Dashboard
        </h2>

        <p className="text-zinc-400">
          Generate a report from chat to view dashboard analytics.
        </p>
      </div>
    );
  }

  /*const chartData =
    reportData.products.map(
      (item: any) => ({
        name: item.productName,
        value: item.addressedQty,
      })
    ); */

  return (
    <div className="space-y-8 mb-10">

     <div className="flex justify-between items-center">

       <h2 className="text-3xl font-bold">
         Procurement Dashboard
       </h2>

       <button
         onClick={downloadPDF}
         className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white"
        >
        Download PDF
      </button>

    </div>

      {/* Summary Cards */}

      <div className="grid md:grid-cols-7 gap-4">

        <div className="bg-slate-800 p-5 rounded-xl">
          <h3>Total Products</h3>
          <p className="text-3xl font-bold">
            {reportData.totalProducts}
          </p>
        </div>

        <div className="bg-green-800 p-5 rounded-xl">
         <h3>Best Combined Cost</h3>
          <p className="text-3xl font-bold">
            ${Number(
  reportData.totalAmount || 0
).toFixed(2)}
          </p>
        </div>

        <div className="bg-yellow-700 p-5 rounded-xl">
          <h3>Qty Match %</h3>
          <p className="text-3xl font-bold">
            {reportData.qtyMatchPercentage}%
          </p>
        </div>

        <div className="bg-blue-700 p-5 rounded-xl">
          <h3>Price Match %</h3>
          <p className="text-3xl font-bold">
            {reportData.overallPriceMatchPercentage}%
          </p>
        </div>
        <div className="bg-red-700 p-5 rounded-xl">
          <h3>Missing Products</h3>
          <p className="text-3xl font-bold">
            {reportData.missingProductCount || 0}
          </p>
        </div>

         <div className="bg-orange-700 p-5 rounded-xl">
           <h3>Extra Products</h3>
           <p className="text-3xl font-bold">
             {reportData.extraProductCount || 0}
            </p>
          </div>

       <div className="bg-purple-700 p-5 rounded-xl">
  <h3>Wrong Specs</h3>
  <p className="text-3xl font-bold">
    {
      reportData.products?.filter(
        (p: any) =>
          p?.specificationMatch === false ||
          String(
            p?.specificationStatus ?? ""
          ).trim().toLowerCase() ===
            "specification mismatch"
      ).length ?? 0
    }
  </p>
</div>
      </div>

      {/* Product Distribution */}
{/*
      <div className="bg-slate-900 p-6 rounded-xl">

        <h3 className="text-xl font-bold mb-4">
          Product Distribution
        </h3>

        <div
          style={{
            width: "100%",
            height: 350,
          }}
        >

          <ResponsiveContainer>

            <PieChart>

              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                label
              >

                {chartData.map(
                  (
                    entry: any,
                    index: any
                  ) => (
                    <Cell
                      key={index}
                      fill={
                        COLORS[
                          index %
                          COLORS.length
                        ]
                      }
                    />
                  )
                )}

              </Pie>

              <Tooltip />

            </PieChart>

          </ResponsiveContainer>

        </div>

      </div> 
      */}

      {/* Procurement Analysis */}

      <div className="bg-slate-900 p-6 rounded-xl overflow-x-auto">

        <h3 className="text-xl font-bold mb-4">
          Procurement Analysis
        </h3>
<table className="w-full border-collapse">

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
      Best Vendor
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
  {reportData.products?.map(
    (item: any, index: number) => {

      /*
       * ============================================================
       * SUPPORT BOTH REPORT TYPES
       *
       * MASTER REPORT:
       *   cheapestVendor
       *   cheapestPrice
       *   vendors[]
       *
       * TRANSACTIONAL REPORT:
       *   vendor
       *   vendorName
       *   addressedQty
       *   vendorPrice
       *   priceDifference
       * ============================================================
       */

      const vendorName =
        item.vendorName ??
        item.vendor ??
        item.bestVendorName ??
        item.bestVendor ??
        item.cheapestVendor ??
        "";

      /*
       * Master reports store vendor information inside vendors[].
       * Transactional reports already have addressedQty directly.
       */

      const matchedVendor =
        Array.isArray(item.vendors)
          ? item.vendors.find(
              (v: any) => {

                const currentVendor =
                  v?.vendorName ??
                  v?.vendor ??
                  "";

                return (
                  String(currentVendor).trim() ===
                  String(vendorName).trim()
                );
              }
            )
          : null;

      /*
       * Addressed quantity.
       *
       * Transactional:
       *   item.addressedQty
       *
       * Master:
       *   matchedVendor.quantity
       *   or matchedVendor.addressedQty
       */

      const rawAddressedQty =
        item.addressedQty ??
        item.vendorAddressedQty ??
        item.vendorQuantity ??
        matchedVendor?.addressedQty ??
        matchedVendor?.quantity ??
        null;

      const hasVendor =
        String(vendorName).trim().length > 0;

      const addressedQty =
        rawAddressedQty !== null &&
        rawAddressedQty !== undefined
          ? Number(rawAddressedQty)
          : null;

      /*
       * Vendor price.
       *
       * Transactional:
       *   item.vendorPrice
       *   item.vendorUnitPrice
       *
       * Master:
       *   item.cheapestPrice
       *   matchedVendor.unitPrice
       */

      const rawVendorPrice =
        item.vendorPrice ??
        item.vendorUnitPrice ??
        item.cheapestPrice ??
        matchedVendor?.unitPrice ??
        matchedVendor?.UnitPrice ??
        null;

      const vendorPrice =
        rawVendorPrice !== null &&
        rawVendorPrice !== undefined
          ? Number(rawVendorPrice)
          : null;

      /*
       * Target price.
       */

      const rawTargetPrice =
        item.targetPrice ??
        item.TargetPrice ??
        null;

      const targetPrice =
        rawTargetPrice !== null &&
        rawTargetPrice !== undefined
          ? Number(rawTargetPrice)
          : null;

      /*
       * Price difference.
       *
       * Prefer the deterministic backend value.
       * Only calculate it if the backend did not provide one.
       */

      const rawPriceDifference =
        item.priceDifference ??
        item.priceDiff ??
        null;

      const priceDifference =
        rawPriceDifference !== null &&
        rawPriceDifference !== undefined
          ? Number(rawPriceDifference)
          : (
              vendorPrice !== null &&
              targetPrice !== null
                ? vendorPrice - targetPrice
                : null
            );

      /*
       * Specification status.
       *
       * Transactional report:
       *   specificationStatus
       *
       * Master report:
       *   specStatus
       */

      const specificationStatus =
        item.specificationStatus ??
        item.specStatus ??
        item.specificationMatch ??
        "";

      /*
       * Recommendation.
       */

      const recommendation =
        item.recommendation ??
        "Not Available";

      return (
        <tr
          key={index}
          className="border-b border-slate-800"
        >

          {/* PRODUCT */}

          <td className="p-2">
            {item.productName ?? "N/A"}
          </td>

          {/* SPECIFICATION */}

          <td className="p-2 text-sm text-slate-300">
            {item.specification ??
              item.specValue ??
              "NA"}
          </td>

          {/* REQUESTED QTY */}

          <td className="p-2">
            {item.requestedQty ??
              item.quantity ??
              0}
          </td>

          {/* TARGET PRICE */}

          <td className="p-2">
            {targetPrice !== null
              ? `$${targetPrice.toFixed(2)}`
              : "NA"}
          </td>

          {/* BEST VENDOR */}

          <td className="p-2 font-medium">

            {hasVendor ? (
              vendorName
            ) : (
              <span className="text-red-400">
                No vendor quoted
              </span>
            )}

          </td>

          {/* ADDRESSED QTY */}

          <td className="p-2">

            {hasVendor &&
            addressedQty !== null
              ? addressedQty
              : "NA"}

          </td>

          {/* VENDOR PRICE */}

          <td className="p-2">

            {hasVendor &&
            vendorPrice !== null
              ? `$${vendorPrice.toFixed(2)}`
              : "NA"}

          </td>

          {/* PRICE DIFFERENCE */}

          <td className="p-2">

            {hasVendor &&
            priceDifference !== null ? (

              <span
                className={
                  priceDifference <= 0
                    ? "text-green-400"
                    : "text-red-400"
                }
              >

                {priceDifference > 0
                  ? "+"
                  : ""}

                ${priceDifference.toFixed(2)}

              </span>

            ) : (
              "NA"
            )}

          </td>

          {/* SPECIFICATION STATUS */}

          <td className="p-2">

            {specificationStatus ===
            "Specification Match" ? (

              <span className="text-green-400">
                Match
              </span>

            ) : specificationStatus ? (

              <span className="text-red-400">
                {specificationStatus}
              </span>

            ) : (

              <span className="text-slate-400">
                NA
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
      </div>
      

      {/* Missing Products */}
      
      {/* Missing Products */}

<div className="bg-slate-900 p-6 rounded-xl">

  <h3 className="text-xl font-bold mb-4">
    Missing Products
  </h3>

  {reportData.missingProducts?.length > 0 ? (

    <ul className="space-y-2">

      {reportData.missingProducts.map(
        (
          item: any,
          index: number
        ) => (

          <li key={index}>

            ❌ {item.productName}

            {" "}

            (
            {item.specValue || "NA"}
            )

          </li>

        )
      )}

    </ul>

  ) : (

    <p>
      No Missing Products
    </p>

  )}

</div>

{/* Extra Products */}

<div className="bg-slate-900 p-6 rounded-xl">

  <h3 className="text-xl font-bold mb-4">
    Extra Products
  </h3>

  {reportData.extraProducts?.length > 0 ? (

    <ul className="space-y-2">

      {reportData.extraProducts.map(
        (
          item: any,
          index: number
        ) => (

          <li key={index}>

            ⚠️ {item.productName}

            {" "}

            (
            {item.specValue || "NA"}
            )

            {" - "}

            <span className="text-yellow-400">
              {item.vendor}
            </span>

          </li>

        )
      )}

    </ul>

  ) : (

    <p>
      No Extra Products
    </p>

  )}

</div>

      {/* AI Insights */}

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

      {/* Quote Details */}

           {/* Quote Details */}

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
            {reportData.inputQuoteId || "N/A"}
          </p>

          <p>
            Quote Number:{" "}
            {reportData.selectedQuoteNumber || "N/A"}
          </p>

          <p>
            Quote Name:{" "}
            {reportData.selectedQuoteName || "N/A"}
          </p>

          <p>
            Vendor:{" "}
            {reportData.selectedVendor || "N/A"}
          </p>

          <p>
            Quote Type:{" "}
            {reportData.selectedQuoteType || "N/A"}
          </p>

          <h4 className="font-semibold text-lg text-green-400 mt-6">
            Parent Master Quote
          </h4>

          <p>
            Master Quote ID:{" "}
            {reportData.parentQuoteId || "N/A"}
          </p>

          <p>
            Master Quote Number:{" "}
            {reportData.parentQuoteNumber || "N/A"}
          </p>

          <p>
            Master Quote Name:{" "}
            {reportData.parentQuoteName || "N/A"}
          </p>

          <h4 className="font-semibold text-lg mt-6">
            Analysis Summary
          </h4>

          <p>
            Total Master Products:{" "}
            {reportData.totalProducts}
          </p>

          <p>
            Best Combined Vendor Cost: $
            {Number(
              reportData.bestCombinedVendorCost ||
              reportData.totalAmount ||
              0
            ).toFixed(2)}
          </p>

        </div>

      </div>

    </div>
  );
}