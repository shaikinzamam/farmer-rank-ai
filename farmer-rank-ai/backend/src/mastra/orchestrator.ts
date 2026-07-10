import { QueryPipelineResult } from "../types";
import { queryWorkflow } from "./workflows/queryWorkflow";

/** Backward-compatible thin wrapper; the registered Mastra workflow is the only pipeline implementation. */
export async function runQueryPipeline(rawQuery: string, userId = "anonymous", userRole: "buyer" | "farmer" | "admin" = "buyer", contactUnlocked = false): Promise<QueryPipelineResult> {
  const run = queryWorkflow.createRun();
  const execution = await run.start({ inputData: { rawQuery, userId, userRole, contactUnlocked } });
  if (execution.status !== "success") throw new Error(`Query workflow ended with status ${execution.status}`);
  return execution.result as QueryPipelineResult;
}
