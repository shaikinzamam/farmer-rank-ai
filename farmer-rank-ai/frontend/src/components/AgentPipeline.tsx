"use client";

import { useEffect, useState } from "react";

export const PIPELINE_STAGES = [
  { key: "intent", label: "Intent Agent", verb: "Think", detail: "structured requirement parsing" },
  { key: "memory-recall", label: "Memory Agent", verb: "Remember", detail: "similar historical matches" },
  { key: "retrieval", label: "Qdrant Retrieval", verb: "Retrieve", detail: "semantic farmer search" },
  { key: "ranking", label: "Ranking Agent", verb: "Evaluate", detail: "six-factor scoring" },
  { key: "explanation", label: "Explanation Agent", verb: "Act", detail: "grounded justification" },
  { key: "safety", label: "Safety Guard", verb: "Safety", detail: "Enkrypt/local guardrail" },
] as const;

export function PipelineStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className={["grid gap-2", compact ? "grid-cols-2 md:grid-cols-6" : "grid-cols-1 sm:grid-cols-3 lg:grid-cols-6"].join(" ")}>
      {PIPELINE_STAGES.map((stage, index) => (
        <div key={stage.key} className="relative rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ledger">{stage.verb}</div>
          <div className="mt-1 text-sm font-medium text-paper">{stage.label}</div>
          {!compact && <div className="mt-1 text-xs text-mute">{stage.detail}</div>}
          {index < PIPELINE_STAGES.length - 1 && (
            <div className="hidden lg:block absolute -right-2 top-1/2 h-px w-2 bg-ledger/40" />
          )}
        </div>
      ))}
    </div>
  );
}

export function AgentPipeline({ active, done }: { active: boolean; done: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setCurrentIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentIndex((index) => (index < PIPELINE_STAGES.length - 1 ? index + 1 : index));
    }, 380);
    return () => clearInterval(interval);
  }, [active]);

  if (!active && !done) return null;

  return (
    <div className="glass-panel rounded-[28px] p-5 soft-glow">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-wheatSoft">
          {done ? "pipeline complete" : "running agent pipeline"}
        </p>
        <span className="rounded-full border border-ledger/25 bg-ledger/10 px-3 py-1 text-xs font-mono text-ledger">
          {done ? "ready" : "live"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {PIPELINE_STAGES.map((stage, index) => {
          const isComplete = done || index < currentIndex;
          const isCurrent = !done && index === currentIndex;
          return (
            <div
              key={stage.key}
              className={[
                "rounded-2xl border px-3 py-3 transition-colors",
                isComplete
                  ? "border-ledger/30 bg-ledger/10"
                  : isCurrent
                    ? "border-wheat/40 bg-wheat/10"
                    : "border-white/10 bg-white/[0.03]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-wheatSoft">{stage.verb}</span>
                <span className={["h-2 w-2 rounded-full", isComplete ? "bg-ledger" : isCurrent ? "bg-wheat animate-pulse" : "bg-white/15"].join(" ")} />
              </div>
              <div className="mt-2 text-sm font-medium text-paper">{stage.label}</div>
              <div className="mt-1 text-xs leading-relaxed text-mute">{stage.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
