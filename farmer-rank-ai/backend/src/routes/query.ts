import { Router } from "express";
import { z } from "zod";
import { runQueryPipeline } from "../mastra/orchestrator";
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
    const result = await runQueryPipeline(parsed.data.query, req.user?.id ?? "anonymous");
    return res.status(200).json(result);
  } catch (err) {
    console.error("[POST /query] pipeline error:", err);
    return res.status(502).json({
      error: "The agent pipeline could not complete this request. Please retry.",
    });
  }
});
