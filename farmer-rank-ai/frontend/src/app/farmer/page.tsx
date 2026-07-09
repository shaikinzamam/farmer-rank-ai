"use client";

import { useState } from "react";
import { createFarmerProfile } from "@/lib/api";

const initial = {
  name: "",
  cropName: "",
  location: "",
  phoneNumber: "",
  whatsappNumber: "",
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "idle" });
    try {
      const { farmer } = await createFarmerProfile({
        ...form,
        phoneNumber: form.phoneNumber.trim() || undefined,
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        certifications: form.certifications.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setStatus({ type: "success", message: `Listed as ${farmer.name} - id ${farmer.id.slice(0, 8)}` });
      setForm(initial);
    } catch (err) {
      const message = (err as Error).message;
      setStatus({ type: message.includes("safety") ? "blocked" : "error", message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-7 lg:grid-cols-[0.86fr_1.14fr]">
      <section className="glass-panel rounded-[32px] p-6 sm:p-8 lg:sticky lg:top-28 lg:self-start">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ledger">farmer console</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl text-paper">Farmer Listing Onboarding</h1>
        <p className="mt-4 text-sm leading-6 text-mute">
          Publish a crop listing into the procurement graph. The backend safety-checks content before it is stored in Postgres and indexed in Qdrant.
        </p>
        <div className="mt-6 rounded-2xl border border-ledger/25 bg-ledger/10 px-4 py-3 text-sm font-mono text-ledger">
          Safety checked before indexing
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniMetric label="Storage" value="Postgres" />
          <MiniMetric label="Search" value="Qdrant" />
        </div>
      </section>

      <section className="glass-panel rounded-[32px] p-5 sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormGroup title="Crop Details">
            <Field label="Farmer name">
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputCls} />
            </Field>
            <Field label="Crop">
              <input required value={form.cropName} onChange={(event) => setForm({ ...form, cropName: event.target.value })} className={inputCls} placeholder="tomato" />
            </Field>
            <Field label="Harvest date">
              <input type="date" required value={form.harvestDate} onChange={(event) => setForm({ ...form, harvestDate: event.target.value })} className={inputCls} />
            </Field>
          </FormGroup>

          <FormGroup title="Pricing & Quantity">
            <Field label="Quantity (kg)">
              <input type="number" required value={form.quantityKg} onChange={(event) => setForm({ ...form, quantityKg: Number(event.target.value) })} className={inputCls} />
            </Field>
            <Field label="Price / kg (Rs)">
              <input type="number" required value={form.pricePerKg} onChange={(event) => setForm({ ...form, pricePerKg: Number(event.target.value) })} className={inputCls} />
            </Field>
          </FormGroup>

          <FormGroup title="Location">
            <Field label="Farm / listing location">
              <input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className={inputCls} placeholder="Bengaluru Rural, Karnataka" />
            </Field>
          </FormGroup>

          <FormGroup
            title="Contact"
            helper="Used only when buyers want to contact you after ranking."
          >
            <Field label="Phone number">
              <input
                required
                type="tel"
                value={form.phoneNumber}
                onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
                className={inputCls}
                placeholder="+919876543210"
              />
            </Field>
            <Field label="WhatsApp number (optional)">
              <input
                type="tel"
                value={form.whatsappNumber}
                onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })}
                className={inputCls}
                placeholder="+919876543210"
              />
            </Field>
          </FormGroup>

          <FormGroup title="Quality & Certifications">
            <Field label="Quality grade">
              <select value={form.qualityGrade} onChange={(event) => setForm({ ...form, qualityGrade: event.target.value as "A" | "B" | "C" })} className={inputCls}>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
              </select>
            </Field>
            <Field label="Certifications (comma separated)">
              <input value={form.certifications} onChange={(event) => setForm({ ...form, certifications: event.target.value })} className={inputCls} placeholder="FSSAI, GAP" />
            </Field>
          </FormGroup>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-ledger px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-ledger/90 disabled:opacity-50"
          >
            {submitting ? "Publishing..." : "Publish Listing"}
          </button>

          {status.type === "success" && (
            <div className="rounded-[22px] border border-ledger/30 bg-ledger/10 p-4 text-sm text-ledger">
              <p className="font-semibold">{status.message}</p>
              <p className="mt-1 text-mute">Listing stored in Postgres and indexed in Qdrant for retrieval.</p>
            </div>
          )}
          {status.type === "blocked" && (
            <div className="rounded-[22px] border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              Listing blocked by the safety guardrail: {status.message}
            </div>
          )}
          {status.type === "error" && (
            <div className="rounded-[22px] border border-danger/40 bg-danger/10 p-4 text-sm text-danger">{status.message}</div>
          )}
        </form>
      </section>
    </div>
  );
}

const inputCls = "premium-input w-full rounded-2xl px-4 py-3 text-sm outline-none transition focus:border-ledger/60";

function FormGroup({ title, helper, children }: { title: string; helper?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-wheatSoft">{title}</legend>
      {helper ? <p className="-mt-2 text-xs leading-5 text-mute">{helper}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-mono text-mute">{label}</span>
      {children}
    </label>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="font-mono text-sm text-paper">{value}</div>
      <div className="mt-1 text-xs text-mute">{label}</div>
    </div>
  );
}
