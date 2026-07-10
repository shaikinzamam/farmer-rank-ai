import { createStep, createWorkflow } from "@mastra/core/workflows";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { cacheGet, cacheKeyForQuery, cacheSet } from "../../db/cache";
import { getFarmerById, writeAuditLog } from "../../db/postgres";
import { QueryPipelineResult, RankedFarmer } from "../../types";
import { runExplanationAgent } from "../agents/explanationAgent";
import { runIntentAgent } from "../agents/intentAgent";
import { persistMemory, recallMemory } from "../agents/memoryAgent";
import { runRankingAgent } from "../agents/rankingAgent";
import { runRetrievalAgent } from "../agents/retrievalAgent";
import { MANDATORY_DISCLAIMER, runSafetyAgent } from "../agents/safetyAgent";

const queryInputSchema = z.object({
  rawQuery: z.string(),
  userId: z.string(),
  userRole: z.enum(["buyer", "farmer", "admin"]),
  contactUnlocked: z.boolean().default(false),
});

const workflowStateSchema = z.object({
  rawQuery: z.string(), userId: z.string(), userRole: z.enum(["buyer", "farmer", "admin"]),
  contactUnlocked: z.boolean(), traceId: z.string(), startedAt: z.number(), cacheKey: z.string(),
  intent: z.any().optional(), memoryContext: z.any().optional(), candidates: z.any().optional(), ranked: z.any().optional(),
});

const workflowOutputSchema = z.object({
  query: z.string(), intent: z.any(), candidatesRetrieved: z.number(), rankedFarmers: z.any(),
  safety: z.any(), disclaimer: z.string(), latencyMs: z.number(), traceId: z.string(),
});

function withoutContacts(result: QueryPipelineResult): QueryPipelineResult {
  return {
    ...result,
    rankedFarmers: result.rankedFarmers.map((item) => ({
      ...item,
      farmer: { ...item.farmer, phoneNumber: undefined, whatsappNumber: undefined },
    })),
  };
}

function maskContact(value?: string): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  const prefix = value.trim().startsWith("+91") ? "+91" : value.trim().slice(0, Math.min(3, value.trim().length));
  return `${prefix} ******${digits.slice(-4)}`;
}

async function applyContactPolicy(ranked: RankedFarmer[], canViewFullContact: boolean): Promise<RankedFarmer[]> {
  return Promise.all(ranked.map(async (item) => {
    const current = await getFarmerById(item.farmer.id);
    return {
      ...item,
      farmer: {
        ...item.farmer,
        phoneNumber: canViewFullContact ? current?.phoneNumber : maskContact(current?.phoneNumber),
        whatsappNumber: canViewFullContact ? current?.whatsappNumber : maskContact(current?.whatsappNumber),
      },
    };
  }));
}

const initialize = createStep({
  id: "initialize", inputSchema: queryInputSchema, outputSchema: workflowStateSchema,
  execute: async ({ inputData, bail }) => {
    const traceId = uuidv4();
    const startedAt = Date.now();
    const cacheKey = cacheKeyForQuery(inputData.rawQuery, inputData.userId);
    const cached = await cacheGet<QueryPipelineResult>(cacheKey);
    if (cached) {
      const rankedFarmers = await applyContactPolicy(cached.rankedFarmers, inputData.userRole === "buyer" && inputData.contactUnlocked);
      return bail({ ...cached, rankedFarmers, traceId, latencyMs: Date.now() - startedAt });
    }
    return { ...inputData, traceId, startedAt, cacheKey };
  },
});

const think = createStep({
  id: "think", inputSchema: workflowStateSchema, outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    const intent = await runIntentAgent(inputData.rawQuery);
    await writeAuditLog({ traceId: inputData.traceId, actor: inputData.userId, action: "parse_intent", agent: "intent-agent", input: inputData.rawQuery, output: intent, safetyFlags: [] });
    return { ...inputData, intent };
  },
});

const rememberRecall = createStep({
  id: "remember-recall", inputSchema: workflowStateSchema, outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    let memoryContext = { similarPastQueries: 0, topFarmerIds: [] as string[] };
    try { memoryContext = await recallMemory(inputData.intent); }
    catch (err) { console.warn("[memory] recall failed; continuing without memory context:", (err as Error).message); }
    return { ...inputData, memoryContext };
  },
});

const retrieve = createStep({
  id: "retrieve", inputSchema: workflowStateSchema, outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    const candidates = await runRetrievalAgent(inputData.intent, 20);
    await writeAuditLog({ traceId: inputData.traceId, actor: inputData.userId, action: "retrieve_candidates", agent: "retrieval-agent", input: inputData.intent, output: { candidateCount: candidates.length, memoryContext: inputData.memoryContext }, safetyFlags: [] });
    return { ...inputData, candidates };
  },
});

const evaluate = createStep({
  id: "evaluate", inputSchema: workflowStateSchema, outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    let ranked = await runRankingAgent(inputData.candidates, inputData.intent, inputData.memoryContext.topFarmerIds);
    ranked = await runExplanationAgent(ranked.slice(0, 10), inputData.intent);
    return { ...inputData, ranked };
  },
});

const safetyGuard = createStep({
  id: "safety-guard", inputSchema: workflowStateSchema, outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => {
    const { ranked: safeRanked, safety } = await runSafetyAgent(inputData.rawQuery, inputData.ranked);
    await writeAuditLog({ traceId: inputData.traceId, actor: inputData.userId, action: "safety_check", agent: "safety-agent", input: { rawQuery: inputData.rawQuery, explanationCount: inputData.ranked.length }, output: { passed: safety.passed }, safetyFlags: safety.flags });
    const cacheable: QueryPipelineResult = { query: inputData.rawQuery, intent: inputData.intent, candidatesRetrieved: inputData.candidates.length, rankedFarmers: safeRanked, safety, disclaimer: MANDATORY_DISCLAIMER, latencyMs: Date.now() - inputData.startedAt, traceId: inputData.traceId };
    await cacheSet(inputData.cacheKey, withoutContacts(cacheable), 30);
    persistMemory(inputData.intent, safeRanked).catch((err) => console.warn("[memory] failed to persist interaction:", err.message));
    return { ...cacheable, rankedFarmers: await applyContactPolicy(safeRanked, inputData.userRole === "buyer" && inputData.contactUnlocked), latencyMs: Date.now() - inputData.startedAt };
  },
});

export const queryWorkflow = createWorkflow({ id: "farmer-query-workflow", inputSchema: queryInputSchema, outputSchema: workflowOutputSchema })
  .then(initialize).then(think).then(rememberRecall).then(retrieve).then(evaluate).then(safetyGuard).commit();
