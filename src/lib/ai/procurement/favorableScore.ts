
import scoreConfig from "./favorableScore.config.json";

export type ScoreParameter =
  | "quantity"
  | "price"
  | "paymentTerms"
  | "mlDrivenValues"
  | "specification";

export interface CriterionScore {
  parameter: ScoreParameter;
  score: number;
  weightedScore: number;
  reason: string;
}

export interface FavorableScoreConfig {
  maxScore: number;
  weightages: Record<ScoreParameter, number>;
  quantity: {
    insufficientQuantityIsNegative: boolean;
    allowFavorableExtraQuantity: boolean;
    maximumPositiveScore: number;
    maximumNegativeScore: number;
  };
  price: {
  maximumPositiveScore: number;
  maximumNegativeScore: number;
  percentagePerScorePoint: number;
};
}

export const FAVORABLE_SCORE_CONFIG =
  scoreConfig as FavorableScoreConfig;

export function validateScoreConfiguration(): boolean {
 const { weightages, maxScore, quantity, price } =
  FAVORABLE_SCORE_CONFIG;

  const totalWeightage = Object.values(weightages).reduce(
    (total, weight) => total + weight,
    0
  );

  if (totalWeightage !== 100) {
    throw new Error(
      `Weightages must total 100. Current total: ${totalWeightage}`
    );
  }

  if (!Number.isFinite(maxScore) || maxScore <= 0) {
    throw new Error("Invalid maximum score.");
  }

  if (
    quantity.maximumPositiveScore < 0 ||
    quantity.maximumNegativeScore > 0
  ) {
    throw new Error("Invalid quantity score limits.");
  }
  if (
  price.maximumPositiveScore < 0 ||
  price.maximumNegativeScore > 0 ||
  price.percentagePerScorePoint <= 0
) {
  throw new Error("Invalid price score configuration.");
}

  return true;
}

/**
 * Calculates quantity deviation on a -10 to +10 scale.
 *
 * Example:
 * Requested: 100
 * Offered: 75
 * Score: -2.5
 *
 * Requested: 100
 * Offered: 120
 * Score: +2
 */
export function calculateQuantityScore(
  requestedQuantity: number,
  offeredQuantity: number
): CriterionScore {
  validateScoreConfiguration();

  if (
    !Number.isFinite(requestedQuantity) ||
    !Number.isFinite(offeredQuantity) ||
    requestedQuantity <= 0 ||
    offeredQuantity < 0
  ) {
    throw new Error("Invalid requested or offered quantity.");
  }

  const config = FAVORABLE_SCORE_CONFIG.quantity;

  const deviationPercentage =
    ((offeredQuantity - requestedQuantity) /
      requestedQuantity) *
    100;

  let score = deviationPercentage / 10;

  if (offeredQuantity < requestedQuantity) {
    score = config.insufficientQuantityIsNegative
      ? Math.min(score, 0)
      : Math.abs(score);
  }

  if (
    offeredQuantity > requestedQuantity &&
    !config.allowFavorableExtraQuantity
  ) {
    score = 0;
  }

  score = Math.min(
    score,
    config.maximumPositiveScore
  );

  score = Math.max(
    score,
    config.maximumNegativeScore
  );

  score = Math.round(score * 100) / 100;

  const weightedScore =
    (score / FAVORABLE_SCORE_CONFIG.maxScore) *
    FAVORABLE_SCORE_CONFIG.weightages.quantity;

  let reason = "Quantity exactly matches the requested quantity.";

  if (offeredQuantity < requestedQuantity) {
    reason = `Quantity shortage: ${requestedQuantity - offeredQuantity} units. Negative score applied.`;
  } else if (offeredQuantity > requestedQuantity) {
    reason = `Extra quantity: ${offeredQuantity - requestedQuantity} units. Positive score applied within the configured limit.`;
  }

  return {
    parameter: "quantity",
    score,
    weightedScore:
      Math.round(weightedScore * 100) / 100,
    reason,
  };
}

export function calculatePriceScore(
  targetPrice: number,
  vendorPrice: number
): CriterionScore {
  validateScoreConfiguration();

  if (
    !Number.isFinite(targetPrice) ||
    !Number.isFinite(vendorPrice) ||
    targetPrice <= 0 ||
    vendorPrice < 0
  ) {
    throw new Error("Invalid target or vendor price.");
  }

  const config = FAVORABLE_SCORE_CONFIG.price;

  const deviationPercentage =
    ((targetPrice - vendorPrice) / targetPrice) * 100;

  let score =
    deviationPercentage / config.percentagePerScorePoint;

  score = Math.min(score, config.maximumPositiveScore);
  score = Math.max(score, config.maximumNegativeScore);

  score = Math.round(score * 100) / 100;

  const weightedScore =
    (score / FAVORABLE_SCORE_CONFIG.maxScore) *
    FAVORABLE_SCORE_CONFIG.weightages.price;

  let reason = "Vendor price exactly matches the target price.";

  if (vendorPrice < targetPrice) {
    reason = `Vendor price is ${Math.abs(deviationPercentage).toFixed(2)}% below target. Positive score applied.`;
  } else if (vendorPrice > targetPrice) {
    reason = `Vendor price is ${deviationPercentage.toFixed(2)}% above target. Negative score applied.`;
  }

  return {
    parameter: "price",
    score,
    weightedScore: Math.round(weightedScore * 100) / 100,
    reason
  };
}

/**
 * Combines only the available criterion scores.
 * The maximum possible score depends on the weightages
 * of the criteria actually provided.
 */
export function calculateFavorableScore(
  criteria: Partial<Record<ScoreParameter, number>>
) {
  validateScoreConfiguration();

  const availableParameters = (
    Object.keys(FAVORABLE_SCORE_CONFIG.weightages) as ScoreParameter[]
  ).filter((parameter) => criteria[parameter] !== undefined);

  const results = availableParameters.map((parameter) => {
    const score = criteria[parameter]!;

    if (!Number.isFinite(score)) {
      throw new Error(`Invalid score for ${parameter}.`);
    }

    const boundedScore = Math.max(
      -FAVORABLE_SCORE_CONFIG.maxScore,
      Math.min(FAVORABLE_SCORE_CONFIG.maxScore, score)
    );

    const weightedScore =
      (boundedScore / FAVORABLE_SCORE_CONFIG.maxScore) *
      FAVORABLE_SCORE_CONFIG.weightages[parameter];

    return {
      parameter,
      score: boundedScore,
      weightedScore: Math.round(weightedScore * 100) / 100,
    };
  });

  const totalScore = results.reduce(
    (total, item) => total + item.weightedScore,
    0
  );

  const availableWeightage = results.reduce(
    (total, item) =>
      total + FAVORABLE_SCORE_CONFIG.weightages[item.parameter],
    0
  );

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    maxPossibleScore: availableWeightage,
    minPossibleScore: -availableWeightage,
    availableWeightage,
    criteria: results,
  };
}
