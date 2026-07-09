"use client";

import { ScoreBreakdown } from "@/lib/api";

const FACTORS: Array<{ key: keyof Omit<ScoreBreakdown, "weightedTotal">; label: string; weight: string; color: string }> = [
  { key: "cropQuality", label: "Crop quality", weight: "30%", color: "#d4a64a" },
  { key: "deliveryReliability", label: "Delivery reliability", weight: "25%", color: "#4fd1c5" },
  { key: "priceMatch", label: "Price match", weight: "20%", color: "#7ddc91" },
  { key: "locationDistance", label: "Location / distance", weight: "10%", color: "#8fa098" },
  { key: "buyerFeedback", label: "Buyer feedback", weight: "10%", color: "#b98b3d" },
  { key: "marketDemandMatch", label: "Market demand match", weight: "5%", color: "#6ee7b7" },
];

export function ScoreLedger({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="ledger-bar">
        {FACTORS.map((factor) => (
          <div
            key={factor.key}
            className="ledger-segment"
            style={{
              width: `${(1 / FACTORS.length) * 100}%`,
              backgroundColor: factor.color,
              opacity: 0.28 + breakdown[factor.key] * 0.72,
            }}
            title={`${factor.label}: ${(breakdown[factor.key] * 100).toFixed(0)}/100`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {FACTORS.map((factor) => {
          const value = Math.round(breakdown[factor.key] * 100);
          return (
            <div key={factor.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs font-mono">
                <span className="text-mute">{factor.label}</span>
                <span className="text-paper">
                  {value}
                  <span className="text-wheatSoft"> / {factor.weight}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${value}%`, backgroundColor: factor.color, boxShadow: `0 0 18px ${factor.color}55` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
