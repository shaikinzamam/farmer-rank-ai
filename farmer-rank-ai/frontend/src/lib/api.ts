export interface ScoreBreakdown {
  cropQuality: number;
  deliveryReliability: number;
  priceMatch: number;
  locationDistance: number;
  buyerFeedback: number;
  marketDemandMatch: number;
  weightedTotal: number;
}

export interface FarmerProfile {
  id: string;
  name: string;
  cropName: string;
  location: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  quantityKg: number;
  pricePerKg: number;
  qualityGrade: "A" | "B" | "C";
  harvestDate: string;
  certifications: string[];
  deliveryReliabilityScore: number;
  buyerFeedbackScore: number;
  totalDeliveries: number;
  onTimeDeliveries: number;
}

export interface RankedFarmer {
  farmer: FarmerProfile;
  scoreBreakdown: ScoreBreakdown;
  rank: number;
  explanation?: string;
}

export interface SafetyFlag {
  category: string;
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface QueryPipelineResult {
  query: string;
  intent: {
    cropName: string;
    quantityKg?: number;
    maxPricePerKg?: number;
    location?: string;
    minQualityGrade?: string;
    confidence: number;
    notes?: string;
  };
  candidatesRetrieved: number;
  rankedFarmers: RankedFarmer[];
  safety: { passed: boolean; flags: SafetyFlag[] };
  disclaimer: string;
  latencyMs: number;
  traceId: string;
}

const BASE = "/api/backend";

export async function submitQuery(query: string): Promise<QueryPipelineResult> {
  const res = await fetch(`${BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.json();
}

export interface FarmerProfileInput {
  name: string;
  cropName: string;
  location: string;
  phone: string;
  whatsapp: string;
  quantityKg: number;
  pricePerKg: number;
  qualityGrade: "A" | "B" | "C";
  harvestDate: string;
  certifications?: string[];
}

export async function createFarmerProfile(input: FarmerProfileInput): Promise<{ farmer: FarmerProfile }> {
  const res = await fetch(`${BASE}/farmer/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body?.details?.fieldErrors?.harvestDate) {
      throw new Error("Harvest date is required.");
    }
    throw new Error(body.detail || body.error || `Request failed with ${res.status}`);
  }
  return res.json();
}

export interface AuditLogEntry {
  id: string;
  trace_id: string;
  actor: string;
  action: string;
  agent: string;
  input: unknown;
  output: unknown;
  safety_flags: SafetyFlag[];
  created_at: string;
}

export async function fetchAuditLogs(limit = 50): Promise<{ logs: AuditLogEntry[] }> {
  const res = await fetch(`${BASE}/admin/audit?limit=${limit}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 403) {
      throw new Error("Admin access required. Current demo user is buyer.");
    }
    if (res.status === 502) {
      throw new Error("Backend unreachable.");
    }
    throw new Error(body.detail || body.error || `Request failed with ${res.status}`);
  }
  return res.json();
}
