import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "../config/env";
import { FarmerProfile } from "../types";
import { v4 as uuidv4 } from "uuid";

export const qdrant = new QdrantClient({
  url: env.qdrant.url,
  apiKey: env.qdrant.apiKey || undefined,
});

/**
 * Two collections back the system:
 *  - farmer_listings: one vector per farmer/crop listing, embedding crop + location + quality text.
 *    This is the semantic retrieval layer for buyer queries ("Think -> Retrieve").
 *  - interaction_memory: one vector per past successful query/match, so the Memory Agent can
 *    recall similar historical buyer intents and bias ranking towards proven matches ("Remember").
 */
export async function ensureCollections(): Promise<void> {
  const collections = await qdrant.getCollections();
  const existing = new Set(collections.collections.map((c) => c.name));

  if (!existing.has(env.qdrant.collectionFarmers)) {
    await qdrant.createCollection(env.qdrant.collectionFarmers, {
      vectors: { size: env.qdrant.embeddingDim, distance: "Cosine" },
    });
  }
  await ensurePayloadIndex("cropName", "keyword");
  await ensurePayloadIndex("qualityGrade", "keyword");
  await ensurePayloadIndex("pricePerKg", "float");

  if (!existing.has(env.qdrant.collectionMemory)) {
    await qdrant.createCollection(env.qdrant.collectionMemory, {
      vectors: { size: env.qdrant.embeddingDim, distance: "Cosine" },
    });
  }
}

async function ensurePayloadIndex(fieldName: string, fieldSchema: "keyword" | "float"): Promise<void> {
  try {
    await qdrant.createPayloadIndex(env.qdrant.collectionFarmers, {
      field_name: fieldName,
      field_schema: fieldSchema,
    });
  } catch (err) {
    const message = (err as Error).message.toLowerCase();
    if (!message.includes("already exists")) {
      throw err;
    }
  }
}

export function farmerToEmbeddingText(farmer: Partial<FarmerProfile>): string {
  return [
    farmer.cropName,
    `grade ${farmer.qualityGrade}`,
    `location ${farmer.location}`,
    farmer.certifications?.length ? `certified ${farmer.certifications.join(", ")}` : "",
    `price ${farmer.pricePerKg} per kg`,
  ]
    .filter(Boolean)
    .join(". ");
}

export async function upsertFarmerVector(farmer: FarmerProfile, vector: number[]): Promise<void> {
  await qdrant.upsert(env.qdrant.collectionFarmers, {
    wait: true,
    points: [
      {
        id: farmer.id,
        vector,
        payload: { ...farmer },
      },
    ],
  });
}

export interface QdrantSearchHit {
  id: string | number;
  score: number;
  payload: Record<string, unknown> | null | undefined;
}

export async function searchFarmers(
  vector: number[],
  filter?: Record<string, unknown>,
  limit = 20
): Promise<QdrantSearchHit[]> {
  const result = await qdrant.search(env.qdrant.collectionFarmers, {
    vector,
    limit,
    filter: filter as any,
    with_payload: true,
  });
  return result as QdrantSearchHit[];
}

/** Store a successful (query -> chosen farmer) interaction so future similar
 * queries can be biased towards proven matches. This is the "Memory" agent's backing store. */
export async function storeInteractionMemory(params: {
  queryText: string;
  vector: number[];
  chosenFarmerId: string;
  outcome: "matched" | "rated" | "delivered";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await qdrant.upsert(env.qdrant.collectionMemory, {
    wait: true,
    points: [
      {
        id: uuidv4(),
        vector: params.vector,
        payload: {
          queryText: params.queryText,
          chosenFarmerId: params.chosenFarmerId,
          outcome: params.outcome,
          metadata: params.metadata ?? {},
          createdAt: new Date().toISOString(),
        },
      },
    ],
  });
}

export async function recallSimilarInteractions(vector: number[], limit = 5): Promise<QdrantSearchHit[]> {
  const result = await qdrant.search(env.qdrant.collectionMemory, {
    vector,
    limit,
    with_payload: true,
  });
  return result as QdrantSearchHit[];
}
