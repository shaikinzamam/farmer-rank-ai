import dotenv from "dotenv";
dotenv.config();

function req(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: parseInt(req("PORT", "4000"), 10),
  nodeEnv: req("NODE_ENV", "development"),
  jwtSecret: req("JWT_SECRET", "dev-secret-not-for-prod"),

  grok: {
    apiKey: req("GROK_API_KEY"),
    baseUrl: req("GROK_BASE_URL", "https://api.x.ai/v1"),
    model: req("GROK_MODEL", "grok-2-latest"),
  },
  featherless: {
    apiKey: req("FEATHERLESS_API_KEY"),
    baseUrl: req("FEATHERLESS_BASE_URL", "https://api.featherless.ai/v1"),
    model: req("FEATHERLESS_MODEL", "deepseek-ai/DeepSeek-V3-0324"),
  },
  llmProvider: req("LLM_PROVIDER", "grok"),
  fallbackProvider: req("FALLBACK_LLM_PROVIDER", "openai"),
  openai: {
    apiKey: req("OPENAI_API_KEY"),
  },

  qdrant: {
    url: req("QDRANT_URL", "http://localhost:6333"),
    apiKey: req("QDRANT_API_KEY"),
    collectionFarmers: req("QDRANT_COLLECTION_FARMERS", "farmer_listings"),
    collectionMemory: req("QDRANT_COLLECTION_MEMORY", "interaction_memory"),
    embeddingDim: parseInt(req("EMBEDDING_DIM", "384"), 10),
  },

  enkrypt: {
    apiKey: req("ENKRYPT_API_KEY"),
    baseUrl: req("ENKRYPT_BASE_URL", "https://api.enkryptai.com"),
    deploymentName: req("ENKRYPT_DEPLOYMENT_NAME", "farmer-rank-ai-guardrails"),
  },

  databaseUrl: req("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/farmer_rank_ai"),
  redisUrl: req("REDIS_URL", "redis://localhost:6379"),

  langfuse: {
    publicKey: req("LANGFUSE_PUBLIC_KEY"),
    secretKey: req("LANGFUSE_SECRET_KEY"),
    baseUrl: req("LANGFUSE_BASE_URL", "https://cloud.langfuse.com"),
  },
};

/** True when we have no real Grok credentials — the system falls back to
 * deterministic mock reasoning so the whole pipeline still runs end-to-end
 * during a hackathon demo without live keys. */
export const isLlmMocked = () =>
  !env.grok.apiKey && !env.openai.apiKey && !env.featherless.apiKey;
export const isEnkryptMocked = () => !env.enkrypt.apiKey;
