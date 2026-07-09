"use client";

import { useEffect, useState } from "react";
import { fetchAuditLogs, AuditLogEntry } from "@/lib/api";

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-wheatSoft mb-2">trust & safety</p>
        <h1 className="font-display text-3xl text-paper">Agent decision audit log</h1>
        <p className="text-sm text-mute mt-2 max-w-xl">
          Every agent action — intent parsing, retrieval, safety checks — is written here with its
          trace id, so any ranking or explanation shown to a buyer can be reconstructed and verified.
        </p>
      </div>

      {loading && <p className="text-mute text-sm">Loading…</p>}
      {error && (
        <div className="border border-danger/40 bg-danger/10 text-danger rounded-sm px-4 py-3 text-sm">
          {error} — start Postgres and hit the backend's /admin/audit endpoint directly to verify connectivity.
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <p className="text-mute text-sm">No agent activity logged yet. Run a buyer query to populate this view.</p>
      )}

      <div className="flex flex-col gap-2">
        {logs.map((log) => (
          <div key={log.id} className="border border-hairline rounded-sm p-4 bg-surface flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-mute">
              <span className="text-wheat">{log.agent}</span>
              <span>{log.action}</span>
              <span>trace {log.trace_id?.slice(0, 8)}</span>
              <span>{new Date(log.created_at).toLocaleString()}</span>
              {Array.isArray(log.safety_flags) && log.safety_flags.length > 0 && (
                <span className="text-danger">{log.safety_flags.length} safety flag(s)</span>
              )}
            </div>
            <details className="text-xs text-mute">
              <summary className="cursor-pointer hover:text-paper">view input / output</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all text-mute/80 font-mono">
                {JSON.stringify({ input: log.input, output: log.output }, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
