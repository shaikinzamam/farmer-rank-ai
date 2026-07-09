import axios from "axios";
import { env } from "../config/env";

/**
 * Produces an embedding vector for a piece of text.
 *
 * Primary path: OpenAI text-embedding-3-small (1536-dim, truncated/padded to
 * env.qdrant.embeddingDim for this project) — used if OPENAI_API_KEY is set.
 *
 * Fallback path: a deterministic hashing-trick embedding. This has no external
 * dependency and requires no key, so the retrieval + memory pipeline is fully
 * demoable offline. It is NOT semantically as strong as a real embedding model,
 * but it is stable, fast, and good enough to prove the Qdrant integration end to
 * end during judging. Swap in a real embedding provider by setting OPENAI_API_KEY.
 */
export async function embedText(text: string): Promise<number[]> {
  if (env.openai.apiKey) {
    try {
      const res = await axios.post(
        "https://api.openai.com/v1/embeddings",
        { model: "text-embedding-3-small", input: text },
        { headers: { Authorization: `Bearer ${env.openai.apiKey}` }, timeout: 8000 }
      );
      const vector: number[] = res.data.data[0].embedding;
      return resizeVector(vector, env.qdrant.embeddingDim);
    } catch (err) {
      console.warn("[embeddings] OpenAI embedding call failed, falling back to hashing embedding:", (err as Error).message);
    }
  }
  return hashingEmbedding(text, env.qdrant.embeddingDim);
}

function resizeVector(vector: number[], targetDim: number): number[] {
  if (vector.length === targetDim) return vector;
  if (vector.length > targetDim) return vector.slice(0, targetDim);
  return [...vector, ...new Array(targetDim - vector.length).fill(0)];
}

/** Deterministic bag-of-words hashing-trick embedding, L2-normalized. */
export function hashingEmbedding(text: string, dim: number): number[] {
  const vector = new Array(dim).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s.]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const token of tokens) {
    const bucket = hashString(token) % dim;
    vector[bucket] += 1;
    // add bigram signal for slightly richer semantics
    const bigramBucket = hashString(token + "_pos") % dim;
    vector[bigramBucket] += 0.25;
  }

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}
