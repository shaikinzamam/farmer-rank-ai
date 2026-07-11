import { Agent } from "@mastra/core/agent";
import { getModel } from "../model";
import { chatComplete } from "../../llm/client";
import { ParsedIntent, RankedFarmer } from "../../types";

const INSTRUCTIONS = `You are the Explanation Agent for Farmer Rank AI. For each ranked farmer you
are given the exact score breakdown that was already computed by the Ranking Agent. Write a short,
factual, one-to-two sentence justification for that rank using ONLY the numbers you were given.

Hard rules:
- Never mention or infer the farmer's caste, religion, gender, or any identity attribute.
- Never state or imply a guaranteed profit, guaranteed price, or guaranteed sale.
- Never invent facts (quality, distance, feedback) that are not present in the score breakdown.
- Always ground the explanation in the specific numbers/ranks you were given.
- Keep it concise: one to two sentences per farmer.`;

export const explanationAgent = new Agent({
  name: "explanation-agent",
  instructions: INSTRUCTIONS,
  model: getModel(),
});

/**
 * Explanation step, the "Act" / communicate stage of the pipeline. Runs after
 * ranking so it can cite the exact ScoreBreakdown numbers rather than
 * hallucinating new justifications — this is the main lever against the
 * PRD's "AI Risks: hallucinations" concern.
 */
export async function runExplanationAgent(ranked: RankedFarmer[], intent: ParsedIntent): Promise<RankedFarmer[]> {
  const results: RankedFarmer[] = [];

  for (const item of ranked) {
    const prompt = `Buyer requirement: ${intent.rawQuery}
Farmer: ${item.farmer.name}, crop: ${item.farmer.cropName}, grade: ${item.farmer.qualityGrade}, price/kg: ${item.farmer.pricePerKg}
Rank: #${item.rank}
Score breakdown (0-100 overall, sub-scores 0-1): ${JSON.stringify(item.scoreBreakdown)}

Write the 1-2 sentence explanation now.`;

    // Explanations use chatComplete() to support Featherless/Grok/OpenAI consistently while the Mastra Agent remains registered in the workflow.
    const explanation = await chatComplete(
      [
        { role: "system", content: INSTRUCTIONS },
        { role: "user", content: prompt },
      ],
      { mockResponder: () => mockExplanation(item) }
    );

    results.push({ ...item, explanation: explanation.trim() });
  }

  return results;
}

function mockExplanation(item: RankedFarmer): string {
  const b = item.scoreBreakdown;
  const reasons: string[] = [];
  if (b.cropQuality >= 0.9) reasons.push("top-grade crop quality");
  if (b.deliveryReliability >= 0.85) reasons.push(`a ${Math.round(b.deliveryReliability * 100)}% on-time delivery rate`);
  if (b.priceMatch >= 0.85) reasons.push("a price at or below your budget");
  if (b.buyerFeedback >= 0.85) reasons.push("strong buyer feedback history");
  if (reasons.length === 0) reasons.push(`an overall match score of ${b.weightedTotal}/100 across quality, reliability, price, and location`);

  return `Ranked #${item.rank} due to ${reasons.join(" and ")}.`;
}
