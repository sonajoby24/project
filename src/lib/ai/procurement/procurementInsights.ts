export function generateProcurementInsights(

  matrix: any[],

  recommendation: any,

  comparison: any[],

  master: any

) {

  let report = "";

  report += "PROCUREMENT ANALYSIS REPORT\n\n";

  if (recommendation) {

    report += "Recommended Vendor\n";

    report += "--------------------------\n";

    report += `Vendor : ${recommendation.vendor}\n`;

    report += `Product : ${recommendation.product}\n`;

    report += `Price : ₹${recommendation.price}\n`;

    report += `Reason : ${recommendation.reason}\n\n`;

  }

  report += "Price Matrix\n";

  report += "--------------------------\n";

  matrix.forEach((item) => {

    report += `${item.product}\n`;

    report += `Vendor : ${item.vendor}\n`;

    report += `Vendor Price : ₹${item.unitPrice}\n`;

    report += `Target Price : ₹${item.targetPrice}\n`;

    report += `Category : ${item.category}\n`;

    report += `Remark : ${item.remark}\n`;

    report += `Difference : ${item.percentage}%\n\n`;

  });

  report += "Quote Comparison\n";

  report += "--------------------------\n";

  comparison.forEach((item) => {

    report += `${item.vendor} - ${item.product} - ₹${item.unitPrice}\n`;

  });

  report += "\nProducts Above Target Price\n";

  report += "--------------------------\n";

 (master?.highPriceProducts || []).forEach((item: any) => {

    report += `${item.product}\n`;

    report += `Vendor : ${item.vendor}\n`;

    report += `Price : ₹${item.unitPrice}\n`;

    report += `Target : ₹${item.targetPrice}\n`;

    report += `Category : ${item.analysis.category}\n`;

    report += `Difference : ${item.analysis.percentage}%\n\n`;

  });

  return report;

}