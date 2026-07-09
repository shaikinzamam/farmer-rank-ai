"use client";

import { ScoreBreakdown } from "@/lib/api";

const FACTORS: Array<{ key: keyof Omit<ScoreBreakdown, "weightedTotal">; label: string; weight: string; color: string }> = [
  { key: "cropQuality", label: "Crop quality", weight: "30%", color: "#D4A64A" },
  { key: "deliveryReliability", label: "Delivery reliability", weight: "25%", color: "#4FD1C5" },
  { key: "priceMatch", label: "Price match", weight: "20%", color: "#8FA098" },
  { key: "locationDistance", label: "Location / distance", weight: "10%", color: "#6E8B7C" },
  { key: "buyerFeedback", label: "Buyer feedback", weight: "10%", color: "#B98B3D" },
  { key: "marketDemandMatch", label: "Market demand match", weight: "5%", color: "#3F5A4D" },
];

export function ScoreLedger({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="ledger-bar">
        {FACTORS.map((f) => (
          <div
            key={f.key}
            className="ledger-segment"
            style={{ width: `${(1 / FACTORS.length) * 100}%`, backgroundColor: f.color, opacity: 0.35 + breakdown[f.key] * 0.65 }}
            title={`${f.label}: ${(breakdown[f.key] * 100).toFixed(0)}/100`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs font-mono text-mute">
        {FACTORS.map((f) => (
          <div key={f.key} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
            <span className="truncate">{f.label}</span>
            <span className="ml-auto text-paper">{(breakdown[f.key] * 100).toFixed(0)}</span>
            <span className="text-wheatSoft">({f.weight})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
