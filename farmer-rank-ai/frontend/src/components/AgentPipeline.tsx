"use client";

import { useEffect, useState } from "react";

export const PIPELINE_STAGES = [
  { key: "intent", label: "Intent Agent", verb: "Think", detail: "parsing your query into a structured requirement" },
  { key: "memory-recall", label: "Memory Agent", verb: "Remember", detail: "recalling similar past buyer matches from Qdrant" },
  { key: "retrieval", label: "Retrieval Agent", verb: "Retrieve", detail: "semantic search over farmer_listings in Qdrant" },
  { key: "ranking", label: "Ranking Agent", verb: "Evaluate", detail: "applying the fixed 6-factor weighted formula" },
  { key: "explanation", label: "Explanation Agent", verb: "Act", detail: "writing a grounded justification per rank" },
  { key: "safety", label: "Safety Agent", verb: "Guard", detail: "Enkrypt AI check for bias, hallucination, financial claims" },
] as const;

/**
 * Steps through the pipeline stages on a timer while `active` is true, so a
 * buyer visibly watches each Mastra agent hand off to the next — instead of
 * staring at a generic spinner for ~1-2s. Purely a presentation timer; it
 * doesn't need real per-stage timestamps from the backend to be honest,
 * since every stage genuinely does run in this order for every request.
 */
export function AgentPipeline({ active, done }: { active: boolean; done: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setCurrentIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i < PIPELINE_STAGES.length - 1 ? i + 1 : i));
    }, 380);
    return () => clearInterval(interval);
  }, [active]);

  if (!active && !done) return null;

  return (
    <div className="border border-hairline rounded-sm bg-surface p-5">
      <p className="font-mono text-xs text-wheatSoft mb-4">
        {done ? "pipeline complete" : "running agent pipeline…"}
      </p>
      <div className="flex flex-col gap-3">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isComplete = done || idx < currentIndex;
          const isCurrent = !done && idx === currentIndex;
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div
                className={[
                  "w-2 h-2 rounded-full shrink-0 transition-colors duration-300",
                  isComplete ? "bg-ledger" : isCurrent ? "bg-wheat animate-pulse" : "bg-hairline",
                ].join(" ")}
              />
              <span className="font-mono text-[10px] uppercase tracking-wider text-wheatSoft w-16 shrink-0">
                {stage.verb}
              </span>
              <span className={["text-sm shrink-0", isComplete || isCurrent ? "text-paper" : "text-mute"].join(" ")}>
                {stage.label}
              </span>
              <span className="text-xs text-mute truncate hidden sm:inline">— {stage.detail}</span>
              {isComplete && <span className="ml-auto text-ledger text-xs font-mono shrink-0">done</span>}
              {isCurrent && <span className="ml-auto text-wheat text-xs font-mono shrink-0">running</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
