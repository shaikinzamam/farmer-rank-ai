import { Agent } from "@mastra/core/agent";
import { getModel } from "../model";
import { embedText } from "../../llm/embeddings";
import { recallSimilarInteractions, storeInteractionMemory } from "../../db/qdrant";
import { ParsedIntent, RankedFarmer } from "../../types";

const INSTRUCTIONS = `You are the Memory Agent. You store successful buyer-farmer matches as
vectors in Qdrant's interaction_memory collection, and recall similar historical queries so the
Ranking Agent's context can be enriched with "buyers who searched for something similar also
matched with..." style signal. You never fabricate memories that were not actually stored.`;

// Registered for Mastra observability/playground introspection; memory recall
// and persistence are deterministic Qdrant operations and need no LLM call.
export const memoryAgent = new Agent({
  name: "memory-agent",
  instructions: INSTRUCTIONS,
  model: getModel(),
});

/** "Remember" step, part 1: look up similar past queries before ranking. */
export async function recallMemory(intent: ParsedIntent): Promise<{ similarPastQueries: number; topFarmerIds: string[] }> {
  const vector = await embedText(intent.rawQuery);
  const hits = await recallSimilarInteractions(vector, 5);
  return {
    similarPastQueries: hits.length,
    topFarmerIds: hits.map((h) => String((h.payload as any)?.chosenFarmerId)).filter(Boolean),
  };
}

/** "Remember" step, part 2: persist this interaction once ranking completes,
 * so future similar queries benefit from it. Called fire-and-forget after
 * the response is sent to the buyer (top-ranked farmer = the "chosen" one). */
export async function persistMemory(intent: ParsedIntent, ranked: RankedFarmer[]): Promise<void> {
  if (ranked.length === 0) return;
  const vector = await embedText(intent.rawQuery);
  await storeInteractionMemory({
    queryText: intent.rawQuery,
    vector,
    chosenFarmerId: ranked[0].farmer.id,
    outcome: "matched",
    metadata: { topScore: ranked[0].scoreBreakdown.weightedTotal, candidateCount: ranked.length },
  });
}
