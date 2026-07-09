import { Router } from "express";
import { z } from "zod";
import { runFarmerProfileAgent } from "../mastra/agents/farmerProfileAgent";
import { recordFeedback } from "../db/postgres";
import { checkText } from "../safety/enkrypt";

export const farmerRouter = Router();

const FarmerProfileSchema = z.object({
  name: z.string().min(2),
  cropName: z.string().min(2),
  location: z.string().min(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phoneNumber: z.string().min(6).optional(),
  whatsappNumber: z.string().min(6).optional(),
  quantityKg: z.number().positive(),
  pricePerKg: z.number().positive(),
  qualityGrade: z.enum(["A", "B", "C"]),
  harvestDate: z.string(),
  certifications: z.array(z.string()).optional(),
});

/** POST /farmer/profile — creates/updates a crop listing (Farmer Profile Agent). */
farmerRouter.post("/farmer/profile", async (req, res) => {
  const parsed = FarmerProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid farmer profile", details: parsed.error.flatten() });
  }

  try {
    const { farmer, blocked } = await runFarmerProfileAgent(parsed.data);
    if (blocked) {
      return res.status(422).json({
        error: "Listing failed the safety guardrail check and was not published.",
      });
    }
    return res.status(201).json({ farmer });
  } catch (err) {
    console.error("[POST /farmer/profile] error:", err);
    return res.status(500).json({ error: "Failed to create farmer profile." });
  }
});

const FeedbackSchema = z.object({
  farmerId: z.string().uuid(),
  buyerId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  onTime: z.boolean(),
  comment: z.string().optional(),
});

/** POST /farmer/feedback — buyer rates a farmer; immediately reweights reliability/feedback scores. */
farmerRouter.post("/farmer/feedback", async (req, res) => {
  const parsed = FeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid feedback payload", details: parsed.error.flatten() });
  }

  try {
    if (parsed.data.comment) {
      const safety = await checkText(parsed.data.comment, "input");
      if (!safety.passed) {
        return res.status(422).json({
          error: "Feedback comment failed the safety guardrail check.",
          flags: safety.flags,
        });
      }
    }

    await recordFeedback({ ...parsed.data, createdAt: new Date().toISOString() });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[POST /farmer/feedback] error:", err);
    return res.status(500).json({ error: "Failed to record feedback." });
  }
});
