import { describe, expect, it } from "vitest";
import { runRankingAgent } from "./rankingAgent";
import { ParsedIntent, RetrievedCandidate } from "../../types";

const intent: ParsedIntent = {
  cropName: "tomato", quantityKg: 500, maxPricePerKg: 20, location: "Bengaluru",
  minQualityGrade: "A", rawQuery: "test", confidence: 1, notes: "",
};

function candidate(id: string, name: string, overrides: Record<string, unknown> = {}): RetrievedCandidate {
  return {
    similarityScore: 0.8,
    farmer: {
      id, name, cropName: "tomato", location: "Bengaluru", quantityKg: 500,
      pricePerKg: 18, qualityGrade: "A", harvestDate: "2026-07-15", certifications: [],
      deliveryReliabilityScore: 0.8, buyerFeedbackScore: 0.8, totalDeliveries: 10,
      onTimeDeliveries: 8, createdAt: "2026-07-01", updatedAt: "2026-07-01",
      ...overrides,
    },
  };
}

describe("runRankingAgent", () => {
  it("scores Grade A above Grade B when other factors match", async () => {
    const ranked = await runRankingAgent([candidate("a", "Grade A"), candidate("b", "Grade B", { qualityGrade: "B" })], intent);
    expect(ranked[0].farmer.name).toBe("Grade A");
  });

  it("scores an under-budget farmer above an over-budget farmer", async () => {
    const ranked = await runRankingAgent([candidate("under", "Under", { pricePerKg: 18 }), candidate("over", "Over", { pricePerKg: 25 })], intent);
    expect(ranked[0].farmer.id).toBe("under");
  });

  it("rewards higher delivery reliability", async () => {
    const ranked = await runRankingAgent([candidate("high", "Reliable", { deliveryReliabilityScore: 0.95 }), candidate("low", "Less reliable", { deliveryReliabilityScore: 0.5 })], intent);
    expect(ranked[0].farmer.id).toBe("high");
  });

  it("rewards higher buyer feedback", async () => {
    const ranked = await runRankingAgent([candidate("high", "High feedback", { buyerFeedbackScore: 0.95 }), candidate("low", "Low feedback", { buyerFeedbackScore: 0.4 })], intent);
    expect(ranked[0].farmer.id).toBe("high");
  });

  it("returns scores in descending order", async () => {
    const ranked = await runRankingAgent([candidate("worst", "Worst", { qualityGrade: "C", pricePerKg: 30 }), candidate("best", "Best"), candidate("middle", "Middle", { deliveryReliabilityScore: 0.6 })], intent);
    expect(ranked.map((item) => item.scoreBreakdown.weightedTotal)).toEqual([...ranked.map((item) => item.scoreBreakdown.weightedTotal)].sort((a, b) => b - a));
  });

  it("deduplicates IDs and equivalent listings, keeping highest similarity", async () => {
    const duplicate = candidate("same", "Duplicate");
    const stronger = { ...duplicate, similarityScore: 0.95 };
    const equivalent = candidate("other-id", "Duplicate");
    const ranked = await runRankingAgent([duplicate, stronger, equivalent], intent);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].farmer.id).toBe("same");
    expect(ranked[0].scoreBreakdown.marketDemandMatch).toBe(0.95);
  });

  it("selects the expected top farmer for a known case", async () => {
    const ranked = await runRankingAgent([candidate("ramesh", "Ramesh Gowda", { deliveryReliabilityScore: 0.95 }), candidate("suresh", "Suresh Patil", { qualityGrade: "B", pricePerKg: 22, deliveryReliabilityScore: 0.7 })], intent);
    expect(ranked[0].farmer).toMatchObject({ id: "ramesh", name: "Ramesh Gowda" });
  });
});
