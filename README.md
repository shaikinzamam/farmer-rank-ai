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
Retrieval Agent      ──▶ "Retrieve"  Qdrant semantic search + dedup over farmer_listings
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
Ranked (top 5), explained, disclaimer-attached response
```

This entire flow runs as a **registered Mastra workflow**
(`backend/src/mastra/workflows/queryWorkflow.ts`), invoked from the
`/query` route via `createRun().start()` — not a hand-rolled function that
happens to sit next to Mastra's agent registry. Caching, audit logging,
traceId/latency tracking, memory recall/persist, retrieval, ranking,
explanation, and the safety gate are all steps inside this workflow.

## Repo layout

```
backend/    Node.js + Express + TypeScript API, Mastra agent pipeline
frontend/   Next.js + TypeScript + Tailwind — buyer / farmer / admin UI
docker-compose.yml   Postgres + Qdrant + Redis + both apps, wired together
```

## Judging-criteria map

| Criterion | Where it lives |
|---|---|
| **Mastra Integration Depth (25%)** | `backend/src/mastra/` — 7 registered `Agent` instances on a `Mastra` instance (`mastra/index.ts`), orchestrated as a real, live multi-step workflow (`mastra/workflows/queryWorkflow.ts`) invoked via `createRun().start()`. Intent and Explanation agents call `.generate()` directly on the Mastra `Agent` object for live LLM calls; Retrieval and Ranking agents are deterministic by design (documented inline as to why) but remain registered for observability/playground introspection. |
| **Qdrant Integration Quality (20%)** | `backend/src/db/qdrant.ts` — two purpose-built collections (`farmer_listings` for retrieval, `interaction_memory` for the Memory Agent), payload indexes, filtered search with graceful fallback, and dedup at the retrieval layer to keep results clean regardless of upstream data hygiene. |
| **Enkrypt AI Coverage (20%)** | `backend/src/safety/enkrypt.ts` — input-side and output-side checks on every request, a custom financial-guarantee policy layered on top, an `opossum` circuit breaker around the live Enkrypt API call, and fail-safe sanitization via a local regex-based guardrail (never a raw crash or silent pass-through). |
| **Agent Output Quality (20%)** | Ranking is a deterministic, auditable, unit-tested formula (`rankingAgent.ts`); explanations are grounded strictly in the computed score breakdown (`explanationAgent.ts`), not free-floating LLM claims. |
| **Problem Impact & Novelty (15%)** | See PRD — direct farmer-to-buyer discovery, explainable trust scoring, a real feedback loop that reweights reliability/feedback scores live from buyer ratings. |

## Quickstart

### Option A — Docker (recommended for a full demo)

```bash
cp backend/.env.example backend/.env
# fill in FEATHERLESS_API_KEY (or GROK_API_KEY / ENKRYPT_API_KEY) in backend/.env
# the system runs fully end-to-end without any of them, in mock/local-guardrail mode.
docker compose up --build
```

Then seed sample farmers into the running backend:

```bash
docker compose exec backend npm run seed
```

- Frontend: http://localhost:3000
- Backend health check: http://localhost:4000/health

**Before any live demo**, do a clean reset so you're not carrying over
duplicate or stale test data from earlier sessions:

```bash
docker compose down -v
docker compose up -d --build
docker compose exec backend npm run seed   # run once — seeding is idempotent, see below
```

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
- No `FEATHERLESS_API_KEY`/`GROK_API_KEY`/`OPENAI_API_KEY` → Intent/Explanation
  agents use a deterministic rule-based mock so the pipeline still runs end-to-end.
- No `ENKRYPT_API_KEY` → a local regex-based guardrail (bias terms,
  financial-guarantee patterns, PII) runs instead, protected by the same
  circuit breaker pattern used for the LLM provider, so safety is never
  silently skipped.
- No Postgres/Qdrant reachable → server still boots and logs a warning; you'll
  need at least these two for `/query` and `/farmer/profile` to actually work,
  since they're the system of record and the vector index.
- Qdrant memory-collection failures during retrieval degrade gracefully
  (empty recall) rather than failing the whole request.

Check `/health` any time to see which mode each subsystem is running in.

## LLM provider support

Featherless, Grok (xAI), and OpenAI are all supported via the same
OpenAI-compatible `createOpenAI({ baseURL })` pattern. Select the active
provider with `LLM_PROVIDER` in `backend/.env`:

```
LLM_PROVIDER=featherless        # or "grok" (default) or leave unset for grok/openai fallback
FEATHERLESS_API_KEY=...
FEATHERLESS_BASE_URL=https://api.featherless.ai/v1
FEATHERLESS_MODEL=deepseek-ai/DeepSeek-V3-0324
```

**Note on structured output:** Intent parsing uses `response_format: json_object`
(text-mode structured JSON) rather than forced tool-calling, specifically
because tool-calling support is inconsistent across OpenAI-compatible
gateways for open-weight models. Do not switch this to Mastra's
schema-forced `.generate()` output mode without first confirming your
chosen model/provider reliably supports required tool_choice — DeepSeek-V3
via Featherless does not, and will throw `No object generated: the tool
was not called`.

## Environment variables

See `backend/.env.example` for the full list. Minimum to go fully "live" for
the demo:

```
FEATHERLESS_API_KEY=...   # or GROK_API_KEY
LLM_PROVIDER=featherless   # or grok
ENKRYPT_API_KEY=...       # Enkrypt AI guardrails
QDRANT_URL=...
DATABASE_URL=...
```

## Testing

```bash
cd backend
npm run test
```

Covers `computeScoreBreakdown` in the Ranking Agent: grade-penalty logic,
price-match monotonicity, neutral defaults when the buyer under-specifies
a constraint, and correct application of the documented 30/25/20/10/10/5
weight formula. This is the auditable core of the system's "Evaluate"
step — the test suite exists specifically so the scoring math can be
verified mechanically, not just eyeballed.

## Demo script (for judges)

1. Open the buyer page, click one of the example chips (or type your own query
   like *"I need 500kg Grade A tomatoes near Bengaluru under ₹20/kg"*).
2. Point out the **parsed intent** panel — this is the Intent Agent's structured
   output, shown before any ranking happens.
3. Point out the **ledger bar** on each result — every one of the six weighted
   factors is visible and adds up to the total score. Nothing is a black box.
4. Point out the **per-rank explanation** — grounded in the exact numbers shown
   in the ledger, not a generic LLM summary.
5. Open the **admin** page (see "Demo roles" below) — every agent step for
   that query is logged with a shared trace id, including the safety check
   outcome.
6. Try a query that would coax a financial-guarantee claim (e.g. ask the
   Explanation Agent's mock path to describe "guaranteed profit") to show the
   Safety Agent intercepting and replacing it.
7. Submit buyer feedback on a ranked farmer, then re-run the same query —
   point out that the farmer's reliability/feedback sub-scores update live
   from the rating, closing the feedback loop end to end.

### Demo roles

There is no full login flow in this build. In local/dev mode, the active
demo identity (buyer / farmer / admin) is selected via the nav bar and sent
as an `x-demo-role` header. Click **admin** in the top nav before visiting
`/admin` to see the audit console; otherwise you'll correctly see "Admin
access required" — this is the real role gate working as intended, not a bug.

## Known limitations

Being upfront about these rather than letting a reviewer discover them
mid-demo:

- **Dev-mode role switching** (`x-demo-role` header) only works when
  `NODE_ENV=development`. It exists purely to make the buyer/farmer/admin
  demo flow testable without a real login system, and is not a security
  mechanism — the actual `requireRole()` gate on `/admin/audit` is enforced
  identically in both modes; only the *identity-selection* step differs.
- **Local safety guardrail is keyword/regex-based**, not semantic. It's a
  reliable fallback for well-known bias terms and financial-guarantee
  phrasing (and is what most demos will actually exercise, since Enkrypt
  keys are optional), but it will not catch paraphrased or subtle bias the
  way a hosted semantic guardrail model would.
- **Location/distance scoring uses semantic similarity as a proxy**, not
  real geodistance, even though farmer lat/lng is stored. Wiring haversine
  distance against the buyer's stated location is a planned improvement.
- **Embeddings fall back to a deterministic local hashing scheme** when no
  `OPENAI_API_KEY` is set (`backend/src/llm/embeddings.ts`). This keeps the
  Qdrant retrieval pipeline demoable offline, but is not semantically as
  strong as a real embedding model — expect looser matching in that mode.
- **Redis cache is in-process by default** (`backend/src/db/cache.ts`); the
  `redis` service in `docker-compose.yml` is provisioned but not yet wired
  in. Swap for a real Redis-backed cache to share state across multiple
  worker instances in production.
- **Mock-mode intent parsing** (used when no LLM provider key is set)
  recognizes a fixed list of common crop names via regex. A crop outside
  that list will parse with low confidence rather than failing outright.

## What's stubbed vs. production-real

This is a hackathon build, engineered to demo the **agentic architecture**
convincingly, not to be production-hardened. Explicitly stubbed, beyond
what's listed above:
- **Langfuse/OTel observability**: not wired in this build; the audit_log
  Postgres table plus per-request `traceId` gives you the same request-level
  traceability for the demo.
- **Seed data reset**: `npm run seed` uses fixed UUIDs for its six sample
  farmers, so re-running it is idempotent (upserts, never duplicates) and
  never touches farmers created through the onboarding form. Use
  `docker compose down -v` before a demo if you want a fully clean slate.
