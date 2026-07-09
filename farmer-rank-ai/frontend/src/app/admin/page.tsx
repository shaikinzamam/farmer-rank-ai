"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAuditLogs, AuditLogEntry } from "@/lib/api";
import { PipelineStrip } from "@/components/AgentPipeline";

export default function AdminPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs(50)
      .then((res) => setLogs(res.logs))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const safetyChecks = logs.filter((log) => log.agent?.includes("safety") || log.action?.includes("safety")).length;
    const retrievalEvents = logs.filter((log) => log.agent?.includes("retrieval") || log.action?.includes("retrieve")).length;
    const rankingEvents = logs.filter((log) => log.agent?.includes("ranking") || log.action?.includes("rank")).length;
    return { total: logs.length, safetyChecks, retrievalEvents, rankingEvents };
  }, [logs]);

  return (
    <div className="space-y-7">
      <section className="glass-panel rounded-[32px] p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-ledger">audit command center</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl text-paper">Agent Audit Console</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-mute">
              Inspect trace-linked decisions across intent parsing, retrieval, ranking, explanation, memory, and safety checks.
            </p>
          </div>
          <span className="rounded-full border border-ledger/25 bg-ledger/10 px-4 py-2 text-xs font-mono uppercase tracking-[0.2em] text-ledger">
            transparent by design
          </span>
        </div>
        <div className="mt-6">
          <PipelineStrip compact />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total Logs" value={String(metrics.total)} />
        <Metric label="Safety Checks" value={String(metrics.safetyChecks)} />
        <Metric label="Retrieval Events" value={String(metrics.retrievalEvents)} />
        <Metric label="Ranking Events" value={String(metrics.rankingEvents)} />
      </section>

      {loading && (
        <div className="glass-card rounded-[24px] p-5 text-sm text-mute">
          Loading audit logs...
        </div>
      )}

      {error && (
        <div className="rounded-[24px] border border-danger/40 bg-danger/10 px-5 py-4 text-sm text-danger">
          {error} - start Postgres and verify the backend /admin/audit endpoint.
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="glass-card rounded-[24px] p-5 text-sm text-mute">
          No agent activity logged yet. Run a buyer query to populate this view.
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <section className="glass-panel rounded-[30px] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl text-paper">Latest Events</h2>
            <span className="font-mono text-xs text-mute">showing {logs.length}</span>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-white/10">
            <div className="hidden grid-cols-[1.2fr_0.8fr_1fr_1fr_0.7fr_1fr] gap-3 border-b border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-mono uppercase tracking-[0.18em] text-mute lg:grid">
              <span>traceId</span>
              <span>actor</span>
              <span>action</span>
              <span>agent</span>
              <span>flags</span>
              <span>timestamp</span>
            </div>
            <div className="divide-y divide-white/10">
              {logs.map((log) => (
                <AuditRow key={log.id} log={log} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function AuditRow({ log }: { log: AuditLogEntry }) {
  const flags = Array.isArray(log.safety_flags) ? log.safety_flags.length : 0;
  return (
    <article className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.2fr_0.8fr_1fr_1fr_0.7fr_1fr] lg:items-center">
      <Field label="traceId" value={log.trace_id?.slice(0, 12) ?? "n/a"} mono />
      <Field label="actor" value={log.actor ?? "unknown"} />
      <Field label="action" value={log.action} />
      <Field label="agent" value={log.agent} tone="accent" />
      <Field label="safety flags" value={flags > 0 ? String(flags) : "none"} tone={flags > 0 ? "danger" : "good"} />
      <Field label="timestamp" value={new Date(log.created_at).toLocaleString()} />
      <details className="lg:col-span-6 rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-xs text-mute">
        <summary className="cursor-pointer font-mono text-paper/80 hover:text-paper">View input / output payload</summary>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all font-mono text-mute/85">
          {JSON.stringify({ input: log.input, output: log.output }, null, 2)}
        </pre>
      </details>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-[24px] p-5">
      <div className="font-mono text-3xl text-paper">{value}</div>
      <div className="mt-2 text-xs uppercase tracking-[0.2em] text-mute">{label}</div>
    </div>
  );
}

function Field({ label, value, mono = false, tone = "neutral" }: { label: string; value: string; mono?: boolean; tone?: "neutral" | "accent" | "good" | "danger" }) {
  const toneClass = tone === "accent" ? "text-wheat" : tone === "good" ? "text-ledger" : tone === "danger" ? "text-danger" : "text-paper";
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-mute lg:hidden">{label}</div>
      <div className={[mono ? "font-mono" : "", toneClass, "break-words"].join(" ")}>{value}</div>
    </div>
  );
}
