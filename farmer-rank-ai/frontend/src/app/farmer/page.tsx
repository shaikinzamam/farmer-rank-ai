"use client";

import { useState } from "react";
import { createFarmerProfile } from "@/lib/api";

const initial = {
  name: "",
  cropName: "",
  location: "",
  quantityKg: 500,
  pricePerKg: 20,
  qualityGrade: "A" as "A" | "B" | "C",
  harvestDate: new Date().toISOString().slice(0, 10),
  certifications: "",
};

export default function FarmerPage() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error" | "blocked"; message?: string }>({ type: "idle" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus({ type: "idle" });
    try {
      const { farmer } = await createFarmerProfile({
        ...form,
        certifications: form.certifications.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setStatus({ type: "success", message: `Listed as ${farmer.name} — id ${farmer.id.slice(0, 8)}` });
      setForm(initial);
    } catch (err) {
      const msg = (err as Error).message;
      setStatus({ type: msg.includes("safety") ? "blocked" : "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <p className="font-mono text-xs uppercase tracking-widest text-wheatSoft mb-2">farmer onboarding</p>
      <h1 className="font-display text-3xl text-paper mb-6">List your crop</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Your name">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Crop">
          <input required value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} className={inputCls} placeholder="tomato" />
        </Field>
        <Field label="Location">
          <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} placeholder="Bengaluru Rural, Karnataka" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity (kg)">
            <input type="number" required value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Price / kg (₹)">
            <input type="number" required value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: Number(e.target.value) })} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quality grade">
            <select value={form.qualityGrade} onChange={(e) => setForm({ ...form, qualityGrade: e.target.value as "A" | "B" | "C" })} className={inputCls}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </Field>
          <Field label="Harvest date">
            <input type="date" required value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Field label="Certifications (comma separated)">
          <input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} className={inputCls} placeholder="FSSAI, GAP" />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 px-6 py-3 bg-wheat text-ink font-medium rounded-sm hover:bg-wheat/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Publishing…" : "Publish listing"}
        </button>

        {status.type === "success" && <p className="text-sm text-ledger">{status.message}</p>}
        {status.type === "blocked" && (
          <p className="text-sm text-danger">Listing blocked by the safety guardrail: {status.message}</p>
        )}
        {status.type === "error" && <p className="text-sm text-danger">{status.message}</p>}
      </form>
    </div>
  );
}

const inputCls = "bg-surface border border-hairline rounded-sm px-3 py-2 text-paper focus:border-wheat outline-none w-full";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-mono text-mute">{label}</span>
      {children}
    </label>
  );
}
