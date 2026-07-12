import { Router } from "express";
import { z } from "zod";
import { mastra } from "../mastra";
import { AuthedRequest } from "../middleware/auth";

export const queryRouter = Router();

const QuerySchema = z.object({
  query: z.string().min(3).max(500),
});

/** POST /query — accepts natural language, returns ranked, safe, explained farmer list. */
queryRouter.post("/query", async (req: AuthedRequest, res) => {
  const parsed = QuerySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  try {
    const workflow = mastra.getWorkflow("queryWorkflow");
    const run = await workflow.createRunAsync();
    const execution = await run.start({ inputData: {
      rawQuery: parsed.data.query,
      userId: req.user?.id ?? "anonymous",
      userRole: req.user?.role ?? "buyer",
      // Authenticated buyers are the currently supported "contact unlocked" state.
      contactUnlocked: req.user?.role === "buyer",
    } });
    if (execution.status !== "success") {
      console.error("[POST /query] workflow execution failed:", execution);
      const workflowError = "error" in execution && execution.error
        ? execution.error instanceof Error ? execution.error.message : String(execution.error)
        : `Query workflow ended with status ${execution.status}`;
      throw new Error(workflowError);
    }
    return res.status(200).json(execution.result);
  } catch (err) {
    console.error("[POST /query] pipeline error:", err);
    return res.status(502).json({
      error: "The agent pipeline could not complete this request. Please retry.",
      ...(process.env.NODE_ENV !== "production" ? { detail: (err as Error).message } : {}),
    });
  }
});
