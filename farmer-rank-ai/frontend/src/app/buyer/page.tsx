"use client";

import { useState } from "react";
import { submitQuery, QueryPipelineResult } from "@/lib/api";
import { ScoreLedger } from "@/components/ScoreLedger";
import { AgentPipeline } from "@/components/AgentPipeline";

const EXAMPLES = [
  "I need 500kg Grade A tomatoes near Bengaluru under ₹20/kg",
  "Looking for 2 tonnes of onions, any grade, best price",
  "Grade A mangoes, 1 tonne, near Mysuru",
];

export default function BuyerPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryPipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col gap-8">
      <section>
        <p className="font-mono text-xs uppercase tracking-widest text-wheatSoft mb-2">buyer discovery</p>
        <h1 className="font-display text-3xl text-paper mb-4">What are you sourcing?</h1>
        <div className="flex gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. I need 500kg Grade A tomatoes near Bengaluru under ₹20/kg"
            className="flex-1 bg-surface border border-hairline rounded-sm px-4 py-3 text-paper placeholder:text-mute/60 focus:border-wheat outline-none"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading}
            className="px-6 py-3 bg-wheat text-ink font-medium rounded-sm hover:bg-wheat/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Ranking…" : "Find farmers"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuery(ex);
                handleSubmit(ex);
              }}
              className="text-xs font-mono text-mute border border-hairline rounded-full px-3 py-1 hover:border-wheat hover:text-wheat transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </section>

      {(loading || result) && (
        <AgentPipeline active={loading} done={!!result} />
      )}

      {error && (
        <div className="border border-danger/40 bg-danger/10 text-danger rounded-sm px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {result && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-mute border-b border-hairline pb-4">
            <span>trace <span className="text-paper">{result.traceId.slice(0, 8)}</span></span>
            <span>candidates retrieved <span className="text-paper">{result.candidatesRetrieved}</span></span>
            <span>latency <span className="text-paper">{result.latencyMs}ms</span></span>
            <span>
              safety{" "}
              <span className={result.safety.passed ? "text-ledger" : "text-danger"}>
                {result.safety.passed ? "passed" : `${result.safety.flags.length} flag(s)`}
              </span>
            </span>
          </div>

          <div className="border border-hairline rounded-sm p-4 bg-surface/60">
            <p className="font-mono text-xs text-wheatSoft mb-1">parsed intent</p>
            <p className="text-sm text-paper">
              crop: <b>{result.intent.cropName}</b>
              {result.intent.quantityKg ? <> · qty: <b>{result.intent.quantityKg}kg</b></> : null}
              {result.intent.maxPricePerKg ? <> · max price: <b>₹{result.intent.maxPricePerKg}/kg</b></> : null}
              {result.intent.location ? <> · near: <b>{result.intent.location}</b></> : null}
              {result.intent.minQualityGrade ? <> · min grade: <b>{result.intent.minQualityGrade}</b></> : null}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {result.rankedFarmers.map((rf) => (
              <div key={rf.farmer.id} className="border border-hairline rounded-sm p-5 bg-surface hover:border-wheat/40 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-2xl text-wheat">#{rf.rank}</span>
                      <span className="text-paper font-medium">{rf.farmer.name}</span>
                      <span className="text-xs font-mono text-mute border border-hairline rounded-full px-2 py-0.5">
                        grade {rf.farmer.qualityGrade}
                      </span>
                    </div>
                    <p className="text-sm text-mute mt-1">
                      {rf.farmer.cropName} · {rf.farmer.location} · ₹{rf.farmer.pricePerKg}/kg · {rf.farmer.quantityKg}kg available
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-2xl text-ledger">{rf.scoreBreakdown.weightedTotal}</div>
                    <div className="text-xs text-mute">/ 100</div>
                  </div>
                </div>

                {rf.explanation && (
                  <p className="text-sm text-paper/90 italic border-l-2 border-wheat/40 pl-3 mb-4">{rf.explanation}</p>
                )}

                <ScoreLedger breakdown={rf.scoreBreakdown} />
              </div>
            ))}
          </div>

          <p className="text-xs text-mute border-t border-hairline pt-4">{result.disclaimer}</p>
        </section>
      )}
    </div>
  );
}
