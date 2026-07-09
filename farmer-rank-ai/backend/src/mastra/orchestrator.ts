import { v4 as uuidv4 } from "uuid";
import { runIntentAgent } from "./agents/intentAgent";
import { runRetrievalAgent } from "./agents/retrievalAgent";
import { runRankingAgent } from "./agents/rankingAgent";
import { runExplanationAgent } from "./agents/explanationAgent";
import { runSafetyAgent, MANDATORY_DISCLAIMER } from "./agents/safetyAgent";
import { recallMemory, persistMemory } from "./agents/memoryAgent";
import { writeAuditLog } from "../db/postgres";
import { cacheGet, cacheKeyForQuery, cacheSet } from "../db/cache";
import { QueryPipelineResult } from "../types";

/**
 * Express-facing query pipeline wrapper. The real Mastra workflow is registered
 * separately in ./workflows/queryWorkflow.ts; this wrapper preserves API-level
 * behavior for cache lookups, traceId/latency fields, and audit logging.
 *
 * Maps directly onto the five required capabilities:
 *   Think    -> Intent Agent (parses the buyer's natural language requirement)
 *   Retrieve -> Retrieval Agent (Qdrant semantic search over farmer_listings)
 *   Remember -> Memory Agent (recall similar past interactions from Qdrant,
 *               then persist this one after the response is built)
 *   Evaluate -> Ranking Agent (deterministic weighted scoring formula)
 *   Act      -> Explanation Agent (buyer-facing justification) gated by the
 *               Safety Agent (Enkrypt AI) before anything is returned
 */
export async function runQueryPipeline(rawQuery: string, actor = "buyer"): Promise<QueryPipelineResult> {
  const traceId = uuidv4();
  const start = Date.now();

  const cacheKey = cacheKeyForQuery(rawQuery);
  const cached = await cacheGet<QueryPipelineResult>(cacheKey);
  if (cached) {
    return { ...cached, traceId, latencyMs: Date.now() - start };
  }

  // 1. Think
  const intent = await runIntentAgent(rawQuery);
  await writeAuditLog({ traceId, actor, action: "parse_intent", agent: "intent-agent", input: rawQuery, output: intent, safetyFlags: [] });

  // 2. Remember (recall) — enrich context with similar historical matches
  const memoryContext = await recallMemory(intent);

  // 3. Retrieve
  const candidates = await runRetrievalAgent(intent, 20);
  await writeAuditLog({
    traceId,
    actor,
    action: "retrieve_candidates",
    agent: "retrieval-agent",
    input: intent,
    output: { candidateCount: candidates.length, memoryContext },
    safetyFlags: [],
  });

  // 4. Evaluate
  let ranked = await runRankingAgent(candidates, intent, memoryContext.topFarmerIds);
  ranked = ranked.slice(0, 10); // top 10 for the buyer

  // 5. Act (explain)
  ranked = await runExplanationAgent(ranked, intent);

  // 6. Safety gate (Enkrypt AI) — runs over the raw query AND every explanation
  const { ranked: safeRanked, safety } = await runSafetyAgent(rawQuery, ranked);
  await writeAuditLog({
    traceId,
    actor,
    action: "safety_check",
    agent: "safety-agent",
    input: { rawQuery, explanationCount: ranked.length },
    output: { passed: safety.passed },
    safetyFlags: safety.flags,
  });

  const result: QueryPipelineResult = {
    query: rawQuery,
    intent,
    candidatesRetrieved: candidates.length,
    rankedFarmers: safeRanked,
    safety,
    disclaimer: MANDATORY_DISCLAIMER,
    latencyMs: Date.now() - start,
    traceId,
  };

  await cacheSet(cacheKey, result, 30);

  // 6. Remember (persist) — fire and forget, don't block the response
  persistMemory(intent, safeRanked).catch((err) => console.warn("[memory] failed to persist interaction:", err.message));

  return result;
}
