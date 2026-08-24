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

  const difference =
    vendorPrice - targetPrice;

  const percentage =
    (difference / targetPrice) * 100;

  let category: string;
  let remark: string;

  if (difference < 0) {
    category = "Below Target";
    remark = "Lower than target price";
  } else if (difference > 0) {
    category = "Above Target";
    remark = "Higher than target price";
  } else {
    category = "At Target";
    remark = "Matches target price";
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