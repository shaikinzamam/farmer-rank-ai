import { Router } from "express";
import { z } from "zod";
import { eraseUserData } from "../db/postgres";
import { qdrant } from "../db/qdrant";
import { env } from "../config/env";

export const userRouter = Router();

const ErasureSchema = z.object({ farmerId: z.string().uuid() });

/** DELETE /user/data — GDPR "Right to Erasure": removes structured + vector records. */
userRouter.delete("/user/data", async (req, res) => {
  const parsed = ErasureSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  try {
    await eraseUserData(parsed.data.farmerId);
    await qdrant.delete(env.qdrant.collectionFarmers, { points: [parsed.data.farmerId] });
    return res.status(200).json({ ok: true, message: "Farmer data erased from all stores." });
  } catch (err) {
    console.error("[DELETE /user/data] error:", err);
    return res.status(500).json({ error: "Failed to erase user data." });
  }
});
