import { Pool } from "pg";
import { env } from "../config/env";
import { AuditLogEntry, FarmerProfile, FeedbackEvent } from "../types";

export const pool = new Pool({ connectionString: env.databaseUrl });

export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS farmers (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      crop_name TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      phone_number TEXT,
      whatsapp_number TEXT,
      quantity_kg NUMERIC NOT NULL,
      price_per_kg NUMERIC NOT NULL,
      quality_grade TEXT NOT NULL CHECK (quality_grade IN ('A','B','C')),
      harvest_date DATE NOT NULL,
      certifications TEXT[] DEFAULT '{}',
      total_deliveries INT DEFAULT 0,
      on_time_deliveries INT DEFAULT 0,
      buyer_feedback_score NUMERIC DEFAULT 0.8,
      pii_masked BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS phone_number TEXT;
    ALTER TABLE farmers ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

    CREATE TABLE IF NOT EXISTS feedback_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE,
      buyer_id TEXT NOT NULL,
      rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      on_time BOOLEAN NOT NULL,
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trace_id UUID NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      agent TEXT NOT NULL,
      input JSONB,
      output JSONB,
      safety_flags JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_trace ON audit_log(trace_id);
    CREATE INDEX IF NOT EXISTS idx_farmers_crop ON farmers(crop_name);
  `);
}

export function rowToFarmerProfile(row: any): FarmerProfile {
  const total = row.total_deliveries ?? 0;
  const onTime = row.on_time_deliveries ?? 0;
  return {
    id: row.id,
    name: row.name,
    cropName: row.crop_name,
    location: row.location,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    whatsappNumber: row.whatsapp_number ?? undefined,
    quantityKg: Number(row.quantity_kg),
    pricePerKg: Number(row.price_per_kg),
    qualityGrade: row.quality_grade,
    harvestDate: row.harvest_date,
    certifications: row.certifications ?? [],
    deliveryReliabilityScore: total > 0 ? onTime / total : 0.75,
    buyerFeedbackScore: Number(row.buyer_feedback_score ?? 0.8),
    totalDeliveries: total,
    onTimeDeliveries: onTime,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertFarmer(farmer: FarmerProfile): Promise<void> {
  await pool.query(
    `INSERT INTO farmers (id, name, crop_name, location, latitude, longitude, phone_number, whatsapp_number, quantity_kg, price_per_kg, quality_grade, harvest_date, certifications, total_deliveries, on_time_deliveries, buyer_feedback_score)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, crop_name = EXCLUDED.crop_name, location = EXCLUDED.location,
        latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
        phone_number = EXCLUDED.phone_number, whatsapp_number = EXCLUDED.whatsapp_number,
        quantity_kg = EXCLUDED.quantity_kg, price_per_kg = EXCLUDED.price_per_kg,
        quality_grade = EXCLUDED.quality_grade, harvest_date = EXCLUDED.harvest_date,
        certifications = EXCLUDED.certifications,
        total_deliveries = EXCLUDED.total_deliveries,
        on_time_deliveries = EXCLUDED.on_time_deliveries,
        buyer_feedback_score = EXCLUDED.buyer_feedback_score,
        updated_at = now()`,
    [
      farmer.id,
      farmer.name,
      farmer.cropName,
      farmer.location,
      farmer.latitude ?? null,
      farmer.longitude ?? null,
      farmer.phoneNumber ?? null,
      farmer.whatsappNumber ?? null,
      farmer.quantityKg,
      farmer.pricePerKg,
      farmer.qualityGrade,
      farmer.harvestDate,
      farmer.certifications,
      farmer.totalDeliveries,
      farmer.onTimeDeliveries,
      farmer.buyerFeedbackScore,
    ]
  );
}

export async function getFarmerById(id: string): Promise<FarmerProfile | null> {
  const res = await pool.query("SELECT * FROM farmers WHERE id = $1", [id]);
  return res.rows[0] ? rowToFarmerProfile(res.rows[0]) : null;
}

export async function recordFeedback(event: FeedbackEvent): Promise<void> {
  await pool.query(
    `INSERT INTO feedback_events (farmer_id, buyer_id, rating, on_time, comment) VALUES ($1,$2,$3,$4,$5)`,
    [event.farmerId, event.buyerId, event.rating, event.onTime, event.comment ?? null]
  );

  // Feedback loop: immediately recompute the farmer's reliability + feedback
  // scores so the next ranking reflects this rating (per PRD 5.4).
  await pool.query(
    `UPDATE farmers SET
       total_deliveries = total_deliveries + 1,
       on_time_deliveries = on_time_deliveries + $2,
       buyer_feedback_score = (
         SELECT COALESCE(AVG(rating), 4.0) / 5.0 FROM feedback_events WHERE farmer_id = $1
       ),
       updated_at = now()
     WHERE id = $1`,
    [event.farmerId, event.onTime ? 1 : 0]
  );
}

export async function writeAuditLog(entry: Omit<AuditLogEntry, "id" | "createdAt">): Promise<void> {
  await pool.query(
    `INSERT INTO audit_log (trace_id, actor, action, agent, input, output, safety_flags) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [entry.traceId, entry.actor, entry.action, entry.agent, JSON.stringify(entry.input), JSON.stringify(entry.output), JSON.stringify(entry.safetyFlags)]
  );
}

export async function getAuditLogs(limit = 100): Promise<any[]> {
  const res = await pool.query("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1", [limit]);
  return res.rows;
}

/** GDPR "Right to Erasure" — deletes a farmer's PII-bearing rows across tables. */
export async function eraseUserData(farmerId: string): Promise<void> {
  await pool.query("DELETE FROM feedback_events WHERE farmer_id = $1", [farmerId]);
  await pool.query("DELETE FROM farmers WHERE id = $1", [farmerId]);
}
