export interface PriceAnalysisResult {
  product: string;
  vendorPrice: number;
  targetPrice: number;
  difference: number;
  percentage: number;
  category: string;
  remark: string;
}

export function analyzePrice(
  product: string,
  vendorPrice: number,
  targetPrice: number
): PriceAnalysisResult {

  if (!targetPrice || targetPrice <= 0) {
    return {
      product,
      vendorPrice,
      targetPrice,
      difference: 0,
      percentage: 0,
      category: "Unknown",
      remark: "Target Price Not Available",
    };
  }

  const difference = vendorPrice - targetPrice;

  const percentage =
    (difference / targetPrice) * 100;

  let category: string;
  let remark: string;

  // Vendor price is lower than target
  if (percentage < 0) {

    category = "Below Target";

    remark = "Lower than target price";

  }

  // Same as target
  else if (percentage === 0) {

    category = "At Target";

    remark = "Matches target price";

  }

  // 0.5% - 3% higher
  else if (percentage >= 0.5 && percentage <= 3) {

    category = "Low";

    remark = "There is slight price hike";

  }

  // >3% - 7% higher
  else if (percentage > 3 && percentage <= 7) {

    category = "Medium";

    remark = "Medium Price Hike";

  }

  // >7% higher
  else {

    category = "High";

    remark = "Higher difference";

  }

  return {
    product,
    vendorPrice,
    targetPrice,
    difference: Number(difference.toFixed(2)),
    percentage: Number(percentage.toFixed(2)),
    category,
    remark,
  };
}