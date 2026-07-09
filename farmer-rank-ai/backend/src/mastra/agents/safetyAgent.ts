import { Agent } from "@mastra/core/agent";
import { getModel } from "../model";
import { checkText } from "../../safety/enkrypt";
import { RankedFarmer, SafetyCheckResult } from "../../types";

const INSTRUCTIONS = `You are the Safety Agent. You never generate buyer-facing content yourself.
Your only job is to route every piece of text produced by other agents through the Enkrypt AI
guardrail check (toxicity, bias, hallucination, PII, financial-guarantee policy) before it is
allowed to reach a buyer, and to block or sanitize anything that fails.`;

export const safetyAgent = new Agent({
  name: "safety-agent",
  instructions: INSTRUCTIONS,
  model: getModel(),
});

export const MANDATORY_DISCLAIMER =
  "Buyer must independently verify crop quality, quantity, and delivery terms before finalizing any purchase. Rankings reflect platform data and do not constitute a guarantee of price, profit, or sale.";

/**
 * Safety step: runs Enkrypt AI over the buyer's raw query (input-side check
 * for abuse/injection) and over every generated explanation (output-side
 * check for bias/hallucination/financial-guarantee claims). This is invoked
 * for every request per the PRD's "Mandatory Enkrypt AI Validation" (5.3).
 */
export async function runSafetyAgent(rawQuery: string, ranked: RankedFarmer[]): Promise<{ ranked: RankedFarmer[]; safety: SafetyCheckResult }> {
  const inputCheck = await checkText(rawQuery, "input");

  const allFlags = [...inputCheck.flags];
  const sanitized: RankedFarmer[] = [];

  for (const item of ranked) {
    if (!item.explanation) {
      sanitized.push(item);
      continue;
    }
    const outputCheck = await checkText(item.explanation, "output");
    allFlags.push(...outputCheck.flags);

    if (outputCheck.passed) {
      sanitized.push(item);
    } else {
      // Fail-safe: replace a flagged explanation with a neutral, fact-only
      // fallback rather than either blocking the whole response or leaking
      // unsafe text to the buyer.
      sanitized.push({
        ...item,
        explanation: `Ranked #${item.rank} with an overall match score of ${item.scoreBreakdown.weightedTotal}/100. (Original explanation withheld by safety guardrails: ${outputCheck.flags.map((f) => f.category).join(", ")}.)`,
      });
    }
  }

  return {
    ranked: sanitized,
    safety: {
      passed: allFlags.length === 0,
      flags: allFlags,
    },
  };
}
