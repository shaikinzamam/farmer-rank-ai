export interface FarmerProfile {
  id: string;
  name: string;
  cropName: string;
  location: string;
  latitude?: number;
  longitude?: number;
  quantityKg: number;
  pricePerKg: number;
  qualityGrade: "A" | "B" | "C";
  harvestDate: string; // ISO date
  certifications: string[];
  deliveryReliabilityScore: number; // 0-1, derived from history
  buyerFeedbackScore: number; // 0-1, derived from ratings
  totalDeliveries: number;
  onTimeDeliveries: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedIntent {
  cropName: string;
  quantityKg?: number;
  maxPricePerKg?: number;
  location?: string;
  minQualityGrade?: "A" | "B" | "C";
  rawQuery: string;
  confidence: number; // 0-1, how confidently the intent agent parsed the query
  notes?: string;
}

export interface RetrievedCandidate {
  farmer: FarmerProfile;
  similarityScore: number; // 0-1 semantic similarity from Qdrant
}

export interface ScoreBreakdown {
  cropQuality: number;
  deliveryReliability: number;
  priceMatch: number;
  locationDistance: number;
  buyerFeedback: number;
  marketDemandMatch: number;
  weightedTotal: number; // 0-100
}

export interface RankedFarmer {
  farmer: FarmerProfile;
  scoreBreakdown: ScoreBreakdown;
  rank: number;
  explanation?: string;
}

export interface SafetyCheckResult {
  passed: boolean;
  flags: SafetyFlag[];
  sanitizedText?: string;
  rawProviderResponse?: unknown;
}

export interface SafetyFlag {
  category: "bias" | "hallucination" | "toxicity" | "financial_guarantee" | "pii" | "policy_violation";
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface QueryPipelineResult {
  query: string;
  intent: ParsedIntent;
  candidatesRetrieved: number;
  rankedFarmers: RankedFarmer[];
  safety: SafetyCheckResult;
  disclaimer: string;
  latencyMs: number;
  traceId: string;
}

export interface FeedbackEvent {
  farmerId: string;
  buyerId: string;
  rating: number; // 1-5
  onTime: boolean;
  comment?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  traceId: string;
  actor: string;
  action: string;
  agent: string;
  input: unknown;
  output: unknown;
  safetyFlags: SafetyFlag[];
  createdAt: string;
}
