import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env, isLlmMocked, isEnkryptMocked } from "./config/env";
import { authenticate } from "./middleware/auth";
import { queryRouter } from "./routes/query";
import { farmerRouter } from "./routes/farmer";
import { adminRouter } from "./routes/admin";
import { userRouter } from "./routes/user";
import { initSchema } from "./db/postgres";
import { ensureCollections } from "./db/qdrant";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Gateway-level rate limiting per PRD 11 (Security Requirements).
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    llmMode: isLlmMocked() ? "mock" : "live",
    safetyMode: isEnkryptMocked() ? "local-guardrail" : "enkrypt-live",
  });
});

app.use(authenticate);
app.use(queryRouter);
app.use(farmerRouter);
app.use(adminRouter);
app.use(userRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[unhandled error]", err);
  res.status(500).json({ error: "Internal server error" });
});

async function bootstrap() {
  try {
    await initSchema();
    console.log("[db] Postgres schema ready");
  } catch (err) {
    console.warn("[db] Postgres not reachable yet — start it and restart the server:", (err as Error).message);
  }

  try {
    await ensureCollections();
    console.log("[qdrant] collections ready");
  } catch (err) {
    console.warn("[qdrant] not reachable yet — start it and restart the server:", (err as Error).message);
  }

  app.listen(env.port, () => {
    console.log(`Farmer Rank AI backend listening on :${env.port}`);
    console.log(`  LLM mode:    ${isLlmMocked() ? "MOCK (set GROK_API_KEY to go live)" : "live"}`);
    console.log(`  Safety mode: ${isEnkryptMocked() ? "local guardrail (set ENKRYPT_API_KEY to go live)" : "Enkrypt AI live"}`);
  });
}

bootstrap();
