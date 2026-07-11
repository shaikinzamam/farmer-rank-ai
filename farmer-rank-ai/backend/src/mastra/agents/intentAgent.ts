import { Agent } from "@mastra/core/agent";
import { chatComplete } from "../../llm/client";
import { getModel } from "../model";
import { ParsedIntent } from "../../types";

const INSTRUCTIONS = `You are the Intent Agent for Farmer Rank AI, an agricultural procurement platform.
Extract a structured buying requirement from a buyer's natural language query.

Return ONLY a JSON object with this exact shape:
{
  "cropName": string,
  "quantityKg": number | null,
  "maxPricePerKg": number | null,
  "location": string | null,
  "minQualityGrade": "A" | "B" | "C" | null,
  "confidence": number,
  "notes": string
}

Rules:
- Convert units to kilograms (e.g. "5 quintal" -> 500, "2 tonnes" -> 2000).
- If a currency symbol like ₹ or "Rs" is used, treat the number as price per kg in INR.
- confidence is your own estimate (0-1) of how completely the query specified crop, quantity, price, and location.
- Never invent a crop, price, or location that is not stated or clearly implied.
- notes should briefly explain any assumptions you made, or be an empty string.`;

/**
 * This is registered as a real Mastra Agent (see mastra/index.ts) so it can be
 * invoked directly by name inside the Mastra workflow/orchestrator, in
 * addition to being callable as a plain function from the Express route.
 */
export const intentAgent = new Agent({
  name: "intent-agent",
  instructions: INSTRUCTIONS,
  model: getModel(),
});

export async function runIntentAgent(rawQuery: string): Promise<ParsedIntent> {
  // Mastra Agent is registered for workflow observability, but structured JSON parsing uses chatComplete() because some OpenAI-compatible providers do not support Mastra object/tool generation reliably.
  const raw = await chatComplete(
    [
      { role: "system", content: INSTRUCTIONS },
      { role: "user", content: rawQuery },
    ],
    {
      jsonMode: true,
      mockResponder: () => mockParseIntent(rawQuery),
    }
  );

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = JSON.parse(mockParseIntent(rawQuery));
  }

  return {
    cropName: parsed.cropName ?? "unknown",
    quantityKg: parsed.quantityKg ?? undefined,
    maxPricePerKg: parsed.maxPricePerKg ?? undefined,
    location: parsed.location ?? undefined,
    minQualityGrade: parsed.minQualityGrade ?? undefined,
    rawQuery,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    notes: parsed.notes ?? "",
  };
}

/** Deterministic regex-based fallback so the Intent Agent works with zero LLM keys configured. */
function mockParseIntent(query: string): string {
  const q = query.toLowerCase();

  const cropMatch = q.match(/\b(tomato|onion|potato|wheat|rice|mango|banana|cotton|sugarcane|maize|chilli|grapes)\w*/);
  const qtyMatch = q.match(/(\d+(?:\.\d+)?)\s*(kg|kilogram|quintal|tonne|ton)/);
  const priceMatch = q.match(/(?:₹|rs\.?\s*)(\d+(?:\.\d+)?)/);
  const gradeMatch = q.match(/grade\s*([abc])/i);
  const locationMatch = q.match(/near\s+([a-z\s]+?)(?:$|\bunder\b|\bwith\b|\bfor\b)/i);

  let quantityKg: number | null = null;
  if (qtyMatch) {
    const val = parseFloat(qtyMatch[1]);
    const unit = qtyMatch[2];
    quantityKg = unit.startsWith("quintal") ? val * 100 : unit.startsWith("ton") ? val * 1000 : val;
  }

  const result = {
    cropName: cropMatch ? cropMatch[1] : "unspecified",
    quantityKg,
    maxPricePerKg: priceMatch ? parseFloat(priceMatch[1]) : null,
    location: locationMatch ? locationMatch[1].trim() : null,
    minQualityGrade: gradeMatch ? gradeMatch[1].toUpperCase() : null,
    confidence: cropMatch ? 0.7 : 0.3,
    notes: "Parsed via local rule-based fallback (no LLM key configured).",
  };
  return JSON.stringify(result);
}
