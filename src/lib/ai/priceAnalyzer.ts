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

  // Validate target price
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
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

  // Validate vendor price
  if (!Number.isFinite(vendorPrice) || vendorPrice < 0) {
    return {
      product,
      vendorPrice,
      targetPrice,
      difference: 0,
      percentage: 0,
      category: "Unknown",
      remark: "Invalid Vendor Price",
    };
  }

  const difference = vendorPrice - targetPrice;

  const percentage = (difference / targetPrice) * 100;

  let category: string;
  let remark: string;

  if (percentage < 0) {
    category = "Below Target";
    remark = "Lower than target price";
  } 
  else if (percentage === 0) {
    category = "At Target";
    remark = "Matches target price";
  } 
  else if (percentage <= 3) {
    category = "Low";
    remark = "There is slight price hike";
  } 
  else if (percentage <= 7) {
    category = "Medium";
    remark = "Medium Price Hike";
  } 
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