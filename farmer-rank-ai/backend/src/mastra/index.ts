import { Mastra } from "@mastra/core/mastra";
import { intentAgent } from "./agents/intentAgent";
import { retrievalAgent } from "./agents/retrievalAgent";
import { rankingAgent } from "./agents/rankingAgent";
import { explanationAgent } from "./agents/explanationAgent";
import { safetyAgent } from "./agents/safetyAgent";
import { memoryAgent } from "./agents/memoryAgent";
import { farmerProfileAgent } from "./agents/farmerProfileAgent";
import { queryWorkflow } from "./workflows/queryWorkflow";

/**
 * Central Mastra registry. Registering every agent here (rather than only
 * instantiating them ad hoc inside orchestrator.ts) is what makes them
 * inspectable via `mastra dev` / the Mastra playground, and gives Mastra's
 * built-in telemetry hooks a single instance to attach to.
 */
export const mastra = new Mastra({
  agents: {
    intentAgent,
    retrievalAgent,
    rankingAgent,
    explanationAgent,
    safetyAgent,
    memoryAgent,
    farmerProfileAgent,
  },
  workflows: {
    queryWorkflow,
  },
});

export { runQueryPipeline } from "./orchestrator";
