import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { runExplanationAgent } from "../agents/explanationAgent";
import { runIntentAgent } from "../agents/intentAgent";
import { recallMemory, persistMemory } from "../agents/memoryAgent";
import { runRankingAgent } from "../agents/rankingAgent";
import { runRetrievalAgent } from "../agents/retrievalAgent";
import { MANDATORY_DISCLAIMER, runSafetyAgent } from "../agents/safetyAgent";

const queryInputSchema = z.object({
  rawQuery: z.string(),
});

const workflowStateSchema = z.object({
  rawQuery: z.string(),
  intent: z.any().optional(),
  memoryContext: z.any().optional(),
  candidates: z.any().optional(),
  ranked: z.any().optional(),
});

const workflowOutputSchema = z.object({
  query: z.string(),
  intent: z.any(),
  candidatesRetrieved: z.number(),
  rankedFarmers: z.any(),
  safety: z.any(),
  disclaimer: z.string(),
});

const think = createStep({
  id: "think",
  inputSchema: queryInputSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    const intent = await runIntentAgent(inputData.rawQuery);
    return { rawQuery: inputData.rawQuery, intent };
  },
});

const rememberRecall = createStep({
  id: "remember-recall",
  inputSchema: workflowStateSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    const memoryContext = await recallMemory(inputData.intent);
    return { ...inputData, memoryContext };
  },
});

const retrieve = createStep({
  id: "retrieve",
  inputSchema: workflowStateSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    const candidates = await runRetrievalAgent(inputData.intent, 20);
    return { ...inputData, candidates };
  },
});

const evaluate = createStep({
  id: "evaluate",
  inputSchema: workflowStateSchema,
  outputSchema: workflowStateSchema,
  execute: async ({ inputData }) => {
    let ranked = await runRankingAgent(inputData.candidates, inputData.intent, inputData.memoryContext.topFarmerIds);
    ranked = ranked.slice(0, 10);
    ranked = await runExplanationAgent(ranked, inputData.intent);
    return { ...inputData, ranked };
  },
});

const safetyGuard = createStep({
  id: "safety-guard",
  inputSchema: workflowStateSchema,
  outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => {
    const { ranked: safeRanked, safety } = await runSafetyAgent(inputData.rawQuery, inputData.ranked);

    persistMemory(inputData.intent, safeRanked).catch((err) =>
      console.warn("[memory] failed to persist interaction:", err.message)
    );

    return {
      query: inputData.rawQuery,
      intent: inputData.intent,
      candidatesRetrieved: inputData.candidates.length,
      rankedFarmers: safeRanked,
      safety,
      disclaimer: MANDATORY_DISCLAIMER,
    };
  },
});

export const queryWorkflow = createWorkflow({
  id: "farmer-query-workflow",
  inputSchema: queryInputSchema,
  outputSchema: workflowOutputSchema,
})
  .then(think)
  .then(rememberRecall)
  .then(retrieve)
  .then(evaluate)
  .then(safetyGuard)
  .commit();
