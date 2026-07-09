import { Agent } from "@mastra/core/agent";
import { getModel } from "../model";
import { embedText } from "../../llm/embeddings";
import { searchFarmers } from "../../db/qdrant";
import { getFarmerById } from "../../db/postgres";
import { ParsedIntent, RetrievedCandidate } from "../../types";

const INSTRUCTIONS = `You are the Retrieval Agent. You do not generate free text — your job is to
convert a parsed buyer intent into a Qdrant semantic search over the farmer_listings collection
and return the closest-matching farmer candidates for the Ranking Agent to score.`;

export const retrievalAgent = new Agent({
  name: "retrieval-agent",
  instructions: INSTRUCTIONS,
  model: getModel(),
});

/**
 * Retrieval step: "Think -> Retrieve".
 * Embeds the buyer's intent, runs a Qdrant vector search (with an optional
 * hard filter on crop name / quality grade), then hydrates full farmer
 * profiles from Postgres so the Ranking Agent has live reliability/feedback
 * data (not just the snapshot payload stored in the vector).
 */
export async function runRetrievalAgent(intent: ParsedIntent, limit = 20): Promise<RetrievedCandidate[]> {
  const searchText = [
    intent.cropName,
    intent.location ? `near ${intent.location}` : "",
    intent.minQualityGrade ? `grade ${intent.minQualityGrade}` : "",
    intent.maxPricePerKg ? `under ${intent.maxPricePerKg} per kg` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const vector = await embedText(searchText);

  const filter =
    intent.cropName && intent.cropName !== "unspecified" && intent.cropName !== "unknown"
      ? { must: [{ key: "cropName", match: { value: intent.cropName } }] }
      : undefined;

  let hits = await searchFarmers(vector, filter, limit);

  // Graceful degrade: if the strict crop filter returns nothing (e.g. crop
  // name casing mismatch or sparse data), retry without the filter so the
  // buyer still gets ranked results rather than an empty response.
  if (hits.length === 0 && filter) {
    hits = await searchFarmers(vector, undefined, limit);
  }

  const candidates: RetrievedCandidate[] = [];
  for (const hit of hits) {
    const farmerId = String(hit.id);
    const farmer = await getFarmerById(farmerId);
    if (farmer) {
      candidates.push({ farmer, similarityScore: hit.score });
    }
  }
  return candidates;
}
