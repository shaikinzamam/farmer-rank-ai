"use client";

import { useState } from "react";
import { submitQuery, QueryPipelineResult, RankedFarmer } from "@/lib/api";
import { ScoreLedger } from "@/components/ScoreLedger";
import { AgentPipeline } from "@/components/AgentPipeline";

const EXAMPLES = [
  "500kg Grade A tomatoes near Bengaluru under Rs 20/kg",
  "Need onions near Hyderabad under Rs 18/kg",
  "Find reliable potato farmers with good feedback",
];

export default function BuyerPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryPipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uniqueRankedFarmers = result
    ? Array.from(new Map(result.rankedFarmers.map((item) => {
        const farmer = item.farmer;
        const key = farmer.id || `${farmer.name}-${farmer.cropName}-${farmer.location}-${farmer.pricePerKg}`;
        return [key, item] as const;
      })).values()).slice(0, 5)
    : [];

  async function handleSubmit(q?: string) {
    const text = (q ?? query).trim();
    if (text.length < 3) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await submitQuery(text);
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-ledger">AI procurement console</p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl text-paper">Buyer Intelligence Console</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-mute">
              Describe the sourcing need. The agent pipeline parses, retrieves, remembers, ranks, explains, and safety-checks the shortlist.
            </p>
          </div>
          {result && (
            <div className="rounded-2xl border border-ledger/25 bg-ledger/10 px-4 py-3 text-sm font-mono text-ledger">
              Safety Passed: {result.safety.passed ? "yes" : "review flags"}
            </div>
          )}
        </div>

        <label className="block">
          <span className="sr-only">Buyer procurement query</span>
          <div className="flex flex-col gap-3 rounded-[26px] border border-white/12 bg-ink/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
              placeholder="Ask for crop, quantity, grade, location, and price ceiling..."
              className="min-h-12 flex-1 bg-transparent px-3 text-base text-paper placeholder:text-mute/70 outline-none"
            />
            <button
              onClick={() => handleSubmit()}
              disabled={loading}
              className="rounded-full bg-ledger px-6 py-3 text-sm font-semibold text-ink transition hover:bg-ledger/90 disabled:opacity-50"
            >
              {loading ? "Ranking..." : "Find Farmers"}
            </button>
          </div>
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => {
                setQuery(example);
                handleSubmit(example);
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-mono text-mute transition hover:border-ledger/40 hover:text-paper"
            >
              {example}
            </button>
          ))}
        </div>
      </section>

      {(loading || result) && <AgentPipeline active={loading} done={!!result} />}

      {error && (
        <div className="rounded-[22px] border border-danger/40 bg-danger/10 px-5 py-4 text-sm text-danger">
          {error}
        </div>
      )}

      {result && (
        <section className="space-y-6">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Candidates retrieved" value={String(result.candidatesRetrieved)} />
            <Metric label="Safety status" value={result.safety.passed ? "Passed" : `${result.safety.flags.length} flags`} tone={result.safety.passed ? "good" : "danger"} />
            <Metric label="Latency" value={`${result.latencyMs}ms`} />
            <Metric label="Trace" value={result.traceId.slice(0, 8)} />
          </div>

          <div className="glass-card rounded-[26px] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-wheatSoft">parsed intent</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <IntentChip label="Crop" value={result.intent.cropName} />
              {result.intent.quantityKg ? <IntentChip label="Quantity" value={`${result.intent.quantityKg}kg`} /> : null}
              {result.intent.maxPricePerKg ? <IntentChip label="Max price" value={`Rs ${result.intent.maxPricePerKg}/kg`} /> : null}
              {result.intent.location ? <IntentChip label="Location" value={result.intent.location} /> : null}
              {result.intent.minQualityGrade ? <IntentChip label="Grade" value={result.intent.minQualityGrade} /> : null}
            </div>
          </div>

          <div className="grid gap-4">
            {uniqueRankedFarmers.map((rankedFarmer) => (
              <RankingCard key={rankedFarmer.farmer.id} rankedFarmer={rankedFarmer} />
            ))}
          </div>

          <div className="glass-card rounded-[24px] p-5">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-wheatSoft">technical details</p>
            <div className="mt-3 grid gap-2 text-sm text-mute md:grid-cols-3">
              <span>traceId: <span className="text-paper">{result.traceId}</span></span>
              <span>latencyMs: <span className="text-paper">{result.latencyMs}</span></span>
              <span>safety: <span className={result.safety.passed ? "text-ledger" : "text-danger"}>{result.safety.passed ? "Safety Passed" : "Flags present"}</span></span>
            </div>
            <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-mute">{result.disclaimer}</p>
          </div>
        </section>
      )}
    </div>
  );
}

function RankingCard({ rankedFarmer }: { rankedFarmer: RankedFarmer }) {
  const { farmer, scoreBreakdown } = rankedFarmer;
  const phoneHref = farmer.phoneNumber ? `tel:${farmer.phoneNumber}` : undefined;
  const whatsappHref = farmer.whatsappNumber ? `https://wa.me/${farmer.whatsappNumber.replace(/\D/g, "")}` : undefined;
  const explanation = rankedFarmer.explanation ?? buildExplanationFallback(rankedFarmer);
  return (
    <article className="glass-panel rounded-[30px] p-5 sm:p-6 transition hover:border-ledger/35">
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-2xl border border-wheat/30 bg-wheat/10 px-3 py-2 font-mono text-lg text-wheat">
              #{rankedFarmer.rank}
            </span>
            <div>
              <h2 className="text-2xl font-semibold text-paper">{farmer.name}</h2>
              <p className="mt-1 text-sm text-mute">
                {farmer.cropName} - {farmer.location}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DataPill label="Price/kg" value={`Rs ${farmer.pricePerKg}`} />
            <DataPill label="Available quantity" value={`${farmer.quantityKg}kg`} />
            <DataPill label="Location" value={farmer.location} />
            <DataPill label="Quality grade" value={farmer.qualityGrade} />
            <DataPill label="Delivery reliability" value={`${Math.round(farmer.deliveryReliabilityScore * 100)}%`} />
            <DataPill label="Buyer feedback" value={`${Math.round(farmer.buyerFeedbackScore * 100)}%`} />
          </div>

          <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-paper/90">
            {explanation}
          </p>
        </div>

        <div className="rounded-[24px] border border-ledger/20 bg-ledger/10 p-5 text-center">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-ledger">weighted score</div>
          <div className="mt-4 font-mono text-5xl text-paper">{scoreBreakdown.weightedTotal}</div>
          <div className="mt-1 text-sm text-mute">out of 100</div>

          <div className="mt-5 rounded-[22px] border border-white/10 bg-ink/35 p-4 text-left">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-wheatSoft">contact farmer</p>
            <p className="mt-2 text-sm text-paper">{maskPhone(farmer.phoneNumber)}</p>
            {phoneHref || whatsappHref ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {phoneHref ? (
                  <a
                    href={phoneHref}
                    className="inline-flex items-center justify-center rounded-full border border-ledger/35 bg-ledger/10 px-4 py-2.5 text-sm font-semibold text-ledger transition hover:bg-ledger/20"
                  >
                    Call Farmer
                  </a>
                ) : null}
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-ledger px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ledger/90"
                  >
                    WhatsApp
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-mute">Contact unavailable</p>
            )}
            <p className="mt-3 text-xs leading-5 text-mute">Contact details are shown for procurement follow-up only.</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ScoreLedger breakdown={scoreBreakdown} />
      </div>

      {(phoneHref || whatsappHref) && (
        <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-cyan-300/20 bg-cyan-300/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ledger">Ready to proceed?</p>
            <p className="mt-1 text-sm text-mute">Use direct contact only for procurement follow-up.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {phoneHref ? (
              <a
                href={phoneHref}
                className="rounded-full border border-ledger/35 bg-ledger/10 px-4 py-2.5 text-sm font-semibold text-ledger transition hover:bg-ledger/20"
              >
                Call Farmer
              </a>
            ) : null}
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-ledger px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ledger/90"
              >
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}

function buildExplanationFallback({ farmer }: RankedFarmer) {
  const reliability = Math.round(farmer.deliveryReliabilityScore * 100);
  const feedback = Math.round(farmer.buyerFeedbackScore * 100);
  const reliabilityNote = farmer.deliveryReliabilityScore < 0.75 ? ", while lower delivery reliability reduced the final score" : "";
  return `Rank reflects ${farmer.qualityGrade} quality, Rs ${farmer.pricePerKg}/kg pricing, ${farmer.quantityKg}kg available quantity, ${reliability}% delivery reliability${reliabilityNote}, and ${feedback}% buyer feedback.`;
}

function maskPhone(phone?: string) {
  if (!phone) return "No contact number";
  const lastFour = phone.replace(/\D/g, "").slice(-4);
  const prefix = phone.trim().startsWith("+91") ? "+91" : phone.trim().slice(0, Math.min(3, phone.trim().length));
  return `${prefix} ******${lastFour}`;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "danger" }) {
  const color = tone === "good" ? "text-ledger" : tone === "danger" ? "text-danger" : "text-paper";
  return (
    <div className="glass-card rounded-[22px] p-4">
      <div className={`font-mono text-xl ${color}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-mute">{label}</div>
    </div>
  );
}

function IntentChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-mute">
      {label}: <span className="text-paper">{value}</span>
    </span>
  );
}

function DataPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="text-xs text-mute">{label}</div>
      <div className="mt-1 font-mono text-sm text-paper">{value}</div>
    </div>
  );
}
