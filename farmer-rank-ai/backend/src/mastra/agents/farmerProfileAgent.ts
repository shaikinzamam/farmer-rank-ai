import { Agent } from "@mastra/core/agent";
import { getModel } from "../model";
import { v4 as uuidv4 } from "uuid";
import { checkText } from "../../safety/enkrypt";
import { embedText } from "../../llm/embeddings";
import { farmerToEmbeddingText, upsertFarmerVector } from "../../db/qdrant";
import { insertFarmer } from "../../db/postgres";
import { FarmerProfile } from "../../types";

const INSTRUCTIONS = `You are the Farmer Profile Agent. You validate and normalize a farmer's
listing (crop, location, price, quantity, quality grade, certifications), run it through the
safety guardrail to strip any PII or policy-violating text, then persist it to Postgres and
index it as a vector in Qdrant so buyer queries can retrieve it.`;

export const farmerProfileAgent = new Agent({
  name: "farmer-profile-agent",
  instructions: INSTRUCTIONS,
  model: getModel(),
});

export interface FarmerProfileInput {
  name: string;
  cropName: string;
  location: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
  whatsappNumber?: string;
  quantityKg: number;
  pricePerKg: number;
  qualityGrade: "A" | "B" | "C";
  harvestDate: string;
  certifications?: string[];
}

/**
 * "Act" step for onboarding: validates + safety-checks the listing text,
 * writes the structured record to Postgres (source of truth), and syncs an
 * embedding to Qdrant (retrieval index) — keeping both stores consistent.
 */
export async function runFarmerProfileAgent(input: FarmerProfileInput): Promise<{ farmer: FarmerProfile; blocked: boolean }> {
  const listingText = `${input.name} ${input.cropName} ${input.location} ${(input.certifications ?? []).join(" ")}`;
  const safety = await checkText(listingText, "input");

  const now = new Date().toISOString();
  const farmer: FarmerProfile = {
    id: uuidv4(),
    name: input.name,
    cropName: input.cropName.toLowerCase().trim(),
    location: input.location,
    latitude: input.latitude,
    longitude: input.longitude,
    phoneNumber: input.phoneNumber,
    whatsappNumber: input.whatsappNumber,
    quantityKg: input.quantityKg,
    pricePerKg: input.pricePerKg,
    qualityGrade: input.qualityGrade,
    harvestDate: input.harvestDate,
    certifications: input.certifications ?? [],
    deliveryReliabilityScore: 0.75, // neutral prior for a brand-new listing with no history
    buyerFeedbackScore: 0.8,
    totalDeliveries: 0,
    onTimeDeliveries: 0,
    createdAt: now,
    updatedAt: now,
  };

  if (!safety.passed) {
    // Block onboarding rather than silently accepting flagged content.
    return { farmer, blocked: true };
  }

  await insertFarmer(farmer);
  const vector = await embedText(farmerToEmbeddingText(farmer));
  await upsertFarmerVector(farmer, vector);

  return { farmer, blocked: false };
}
