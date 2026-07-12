# Farmer Rank AI

An agentic (not chatbot) system that turns a buyer's plain-language sourcing
request into a ranked, explained, safety-checked shortlist of farmers —
built on **Mastra** orchestration, **Qdrant** semantic retrieval, and
**Enkrypt AI** guardrails, per the project PRD.

```
Buyer query
   │
   ▼
Intent Agent        ──▶  "Think"     structured requirement (crop, qty, price, location, grade)
   │
   ▼
Memory Agent (recall) ─▶ "Remember"  similar past matches from Qdrant interaction_memory
   │
   ▼
Retrieval Agent      ──▶ "Retrieve"  Qdrant semantic search over farmer_listings
   │
   ▼
Ranking Agent        ──▶ "Evaluate"  fixed weighted formula (quality 30 / reliability 25 /
   │                                 price 20 / location 10 / feedback 10 / demand 5)
   ▼
Explanation Agent    ──▶ "Act"       plain-language justification per rank
   │
   ▼
Safety Agent (Enkrypt AI) ─────────  blocks/sanitizes bias, hallucination, financial-
   │                                 guarantee claims, PII before the buyer sees anything
   ▼
Memory Agent (persist)  ───────────  stores this interaction for future recall
   │
   ▼
Ranked, explained, disclaimer-attached response
```

## Repo layout

```
backend/    Node.js + Express + TypeScript API, Mastra agent pipeline
frontend/   Next.js + TypeScript + Tailwind — buyer / farmer / admin UI
docker-compose.yml   Postgres + Qdrant + Redis + both apps, wired together
```

## Listing storage and retrieval

Farmer onboarding stores each structured listing in Postgres, the system of record. The same listing is indexed as an embedding in Qdrant using `farmer.id` as the point ID. Buyer queries retrieve matching IDs from Qdrant, then hydrate the current farmer details from Postgres before ranking.

Demo seed farmers use stable IDs, so repeated seed runs update the same six Postgres rows and Qdrant points without deleting onboarding-created listings. Reseeding restores the demo farmers' seeded delivery and feedback statistics.

## Judging-criteria map

| Criterion | Where it lives |
|---|---|
| **Mastra Integration Depth (25%)** | `backend/src/mastra/` — 7 distinct `Agent` instances registered on one `Mastra` instance; `queryWorkflow.ts` is the live request path invoked through Mastra's workflow execution API |
| **Qdrant Integration Quality (20%)** | `backend/src/db/qdrant.ts` — two purpose-built collections (`farmer_listings` for retrieval, `interaction_memory` for the Memory Agent), payload indexes, filtered search with graceful fallback |
| **Enkrypt AI Coverage (20%)** | `backend/src/safety/enkrypt.ts` — input-side and output-side checks on every request, custom financial-guarantee policy layered on top, fail-safe sanitization (never a raw crash or silent pass-through) |
| **Agent Output Quality (20%)** | Ranking is a deterministic, auditable formula (`rankingAgent.ts`); explanations are grounded strictly in the computed score breakdown (`explanationAgent.ts`), not free-floating LLM claims |
| **Problem Impact & Novelty (15%)** | See PRD — direct farmer-to-buyer discovery, explainable trust scoring, feedback loop that reweights reliability in real time |

## Quickstart

### Option A — Docker (recommended for a full demo)

```bash
cp backend/.env.example backend/.env
# fill in GROK_API_KEY and ENKRYPT_API_KEY in backend/.env if you have them —
# the system runs fully end-to-end without them, in mock/local-guardrail mode.
docker compose up --build
```

Then seed sample farmers into the running backend:

```bash
docker compose exec backend npm run seed
```

- Frontend: http://localhost:3000
- Backend health check: http://localhost:4000/health

### Option B — Run locally without Docker

You need Postgres and Qdrant reachable somewhere (local install, Docker for
just those two, or hosted — e.g. Supabase for Postgres, Qdrant Cloud free tier).

```bash
cd backend
cp .env.example .env   # edit DATABASE_URL / QDRANT_URL to point at your instances
npm install
npm run seed            # populates 6 sample farmer listings
npm run dev             # http://localhost:4000

# in a second terminal
cd frontend
npm install
echo "BACKEND_URL=http://localhost:4000" > .env.local
npm run dev              # http://localhost:3000
```

### Running with no external services at all

The backend is deliberately built to **degrade gracefully**:
- No `GROK_API_KEY`/`OPENAI_API_KEY` → Intent/Explanation agents use a
  deterministic rule-based mock so the pipeline still runs end-to-end.
- No `ENKRYPT_API_KEY` → a local regex-based guardrail (bias terms,
  financial-guarantee patterns, PII) runs instead, so safety is never silently skipped.
- No Postgres/Qdrant reachable → server still boots and logs a warning; you'll
  need at least these two for `/query` and `/farmer/profile` to actually work,
  since they're the system of record and the vector index.

Check `/health` any time to see which mode each subsystem is running in.

## Demo script (for judges)

1. Open the buyer page, click one of the example chips (or type your own query
   like *"I need 500kg Grade A tomatoes near Bengaluru under ₹20/kg"*).
2. Point out the **parsed intent** panel — this is the Intent Agent's structured
   output, shown before any ranking happens.
3. Point out the **ledger bar** on each result — every one of the six weighted
   factors is visible and adds up to the total score. Nothing is a black box.
4. Point out the **per-rank explanation** — grounded in the exact numbers shown
   in the ledger, not a generic LLM summary.
5. Open the **admin** page with an admin token — every agent step for that query
   is logged with a shared trace id, including the safety check outcome.
6. Try a query that would coax a financial-guarantee claim (e.g. ask the
   Explanation Agent's mock path to describe "guaranteed profit") to show the
   Safety Agent intercepting and replacing it.

## Environment variables

See `backend/.env.example` for the full list. Minimum to go fully "live" for
the demo:

```
GROK_API_KEY=...          # xAI Grok, OpenAI-compatible chat completions API
ENKRYPT_API_KEY=...       # Enkrypt AI guardrails
QDRANT_URL=...
DATABASE_URL=...
```

## Notes on the LLM provider

The PRD stack lists OpenAI/Anthropic; this build targets **Grok** per your
instruction, via `createOpenAI({ baseURL: "https://api.x.ai/v1" })` (Grok's API
is OpenAI-compatible), with automatic circuit-breaker fallback to OpenAI if
`OPENAI_API_KEY` is also set and Grok is unreachable — satisfying the PRD's
"circuit breakers for external LLM... APIs" NFR.

### Using Featherless.ai as LLM Provider

1. Sign up on Featherless.ai and create an API key from the API Keys page.
2. Choose a model from the model catalog. The recommended model is
   `deepseek-ai/DeepSeek-V3-0324`.
3. Set `FEATHERLESS_API_KEY` in `backend/.env`.
4. Set `LLM_PROVIDER=featherless`.

Featherless uses the OpenAI-compatible `/v1/chat/completions` API.

## What's stubbed vs. production-real

This is a hackathon scaffold, built to demo the **agentic architecture**
convincingly, not to be production-hardened. Explicitly stubbed:
- **Embeddings**: falls back to a deterministic local hashing embedding when
  no `OPENAI_API_KEY` is set (see `backend/src/llm/embeddings.ts`). Swap in a
  real embedding model for production-quality semantic search.
- **Redis cache**: in-process `Map` by default (`backend/src/db/cache.ts`);
  swap for real Redis to share cache across multiple worker instances.
- **Location/distance scoring**: uses semantic similarity as a proxy; wire in
  real geodistance (haversine on lat/lng) for production.
- **Langfuse/OTel observability**: not wired in this scaffold; the audit_log
  Postgres table plus per-request `traceId` gives you the same request-level
  traceability for the demo.

## Known Limitations

- The local demo safety guardrail is keyword/rule based when an Enkrypt API key is not configured.
- Featherless and other OpenAI-compatible models may not reliably support forced tool-calling, so the project uses JSON prompting and fallback parsing.
- Admin audit is role-protected. The demo identity defaults to buyer; clicking the Admin navigation link selects the development-only admin identity.
- Location scoring is approximate unless real geodistance is enabled.
- Pipeline progress is a UI visualization, not a real-time stream of backend step events unless SSE is enabled.
- Redis is included for future distributed cache/session expansion; the current demo cache is process-local and in memory.
