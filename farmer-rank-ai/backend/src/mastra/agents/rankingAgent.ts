import { Agent } from "@mastra/core/agent";
import { getModel } from "../model";
import { ParsedIntent, RankedFarmer, RetrievedCandidate, ScoreBreakdown } from "../../types";

const INSTRUCTIONS = `You are the Ranking Agent for Farmer Rank AI. You apply a fixed, auditable
weighted scoring formula (never invent your own weights):
Crop Quality 30%, Delivery Reliability 25%, Price Match 20%, Location/Distance 10%,
Buyer Feedback 10%, Market Demand Match 5%. You never use identity attributes
(caste, religion, gender, name) as a scoring input.`;

// Registered for Mastra observability/playground introspection; scoring is a
// deterministic, auditable formula and therefore does not need an LLM call.
export const rankingAgent = new Agent({
  name: "ranking-agent",
  instructions: INSTRUCTIONS,
  model: getModel(),
});

// Weights straight from PRD 5.2 — kept as named constants so the formula is
// transparent and auditable rather than buried in the math.
const WEIGHTS = {
  cropQuality: 0.3,
  deliveryReliability: 0.25,
  priceMatch: 0.2,
  locationDistance: 0.1,
  buyerFeedback: 0.1,
  marketDemandMatch: 0.05,
};

const GRADE_SCORE: Record<string, number> = { A: 1, B: 0.7, C: 0.45 };

function scoreCropQuality(gradeMatch: string, minGrade?: string): number {
  const base = GRADE_SCORE[gradeMatch] ?? 0.5;
  if (minGrade && GRADE_SCORE[gradeMatch] < GRADE_SCORE[minGrade]) {
    return base * 0.5; // penalize falling below the buyer's stated minimum grade
  }
  return base;
}

function scorePriceMatch(price: number, maxPrice?: number): number {
  if (!maxPrice) return 0.7; // neutral-ish score when buyer gave no price ceiling
  if (price <= maxPrice) {
    // reward being at/under budget, extra credit for being meaningfully cheaper
    const savingsRatio = (maxPrice - price) / maxPrice;
    return Math.min(1, 0.75 + savingsRatio);
  }
  const overBy = (price - maxPrice) / maxPrice;
  return Math.max(0, 0.5 - overBy); // steep penalty for exceeding budget
}

function scoreLocationDistance(similarityScore: number, locationStated: boolean): number {
  // We don't have real geodistance in this scaffold; use semantic similarity
  // (which already encodes location text) as a proxy, and stay neutral if the
  // buyer never specified a location constraint.
  return locationStated ? similarityScore : 0.6;
}

function scoreMarketDemandMatch(similarityScore: number): number {
  return similarityScore;
}

export function computeScoreBreakdown(candidate: RetrievedCandidate, intent: ParsedIntent): ScoreBreakdown {
  const { farmer, similarityScore } = candidate;

  const cropQuality = scoreCropQuality(farmer.qualityGrade, intent.minQualityGrade);
  const deliveryReliability = farmer.deliveryReliabilityScore;
  const priceMatch = scorePriceMatch(farmer.pricePerKg, intent.maxPricePerKg);
  const locationDistance = scoreLocationDistance(similarityScore, !!intent.location);
  const buyerFeedback = farmer.buyerFeedbackScore;
  const marketDemandMatch = scoreMarketDemandMatch(similarityScore);

  const weightedTotal =
    (cropQuality * WEIGHTS.cropQuality +
      deliveryReliability * WEIGHTS.deliveryReliability +
      priceMatch * WEIGHTS.priceMatch +
      locationDistance * WEIGHTS.locationDistance +
      buyerFeedback * WEIGHTS.buyerFeedback +
      marketDemandMatch * WEIGHTS.marketDemandMatch) *
    100;

  return {
    cropQuality: round(cropQuality),
    deliveryReliability: round(deliveryReliability),
    priceMatch: round(priceMatch),
    locationDistance: round(locationDistance),
    buyerFeedback: round(buyerFeedback),
    marketDemandMatch: round(marketDemandMatch),
    weightedTotal: round(weightedTotal),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Ranking step: "Evaluate". Pure, deterministic, auditable — no LLM call in
 * the scoring itself (this is deliberate: buyers and judges can verify the
 * math directly from ScoreBreakdown, which the Explanation Agent then
 * narrates in natural language).
 */
export async function runRankingAgent(
  candidates: RetrievedCandidate[],
  intent: ParsedIntent,
  memoryBoostFarmerIds: string[] = []
): Promise<RankedFarmer[]> {
  const memoryBoostSet = new Set(memoryBoostFarmerIds);
  const scored = candidates.map((c) => ({
    farmer: c.farmer,
    scoreBreakdown: applyMemoryBoost(computeScoreBreakdown(c, intent), memoryBoostSet.has(c.farmer.id)),
  }));

  scored.sort((a, b) => b.scoreBreakdown.weightedTotal - a.scoreBreakdown.weightedTotal);

  return scored.map((s, idx) => ({ ...s, rank: idx + 1 }));
}

function applyMemoryBoost(scoreBreakdown: ScoreBreakdown, shouldBoost: boolean): ScoreBreakdown {
  if (!shouldBoost) return scoreBreakdown;
  return {
    ...scoreBreakdown,
    weightedTotal: round(Math.min(100, scoreBreakdown.weightedTotal + 3)),
  };
}
