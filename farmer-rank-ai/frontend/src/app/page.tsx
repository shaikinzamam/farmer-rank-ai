import Link from "next/link";
import { PipelineStrip } from "@/components/AgentPipeline";

const CAPABILITIES = [
  ["Think", "Intent Agent turns a buyer request into crop, quantity, price, location, and grade constraints."],
  ["Retrieve", "Qdrant semantic search finds relevant live farmer listings across the vector index."],
  ["Remember", "Memory Agent recalls similar past matches so proven outcomes can influence ranking."],
  ["Evaluate", "Ranking Agent applies an auditable six-factor score without identity attributes."],
  ["Act", "Explanation and safety agents return guarded, transparent procurement recommendations."],
];

const TECH_BADGES = ["Mastra", "Qdrant", "Postgres", "Enkrypt AI", "Grok/OpenAI fallback"];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-[34px] px-6 py-8 sm:px-10 sm:py-12 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-ledger">Spatial AI procurement dashboard</p>
            <h1 className="mt-5 font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight text-paper">
              Farmer Rank AI
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-mute">
              Agentic AI procurement intelligence for ranking farmers fairly, safely, and transparently.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/buyer" className="rounded-full bg-ledger px-5 py-3 text-sm font-semibold text-ink shadow-[0_0_32px_rgba(79,209,197,0.28)] transition hover:bg-ledger/90">
                Open Buyer Console
              </Link>
              <Link href="/farmer" className="rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-paper transition hover:border-wheat/50">
                Add Farmer Listing
              </Link>
              <Link href="/admin" className="rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-paper transition hover:border-wheat/50">
                View Audit Dashboard
              </Link>
            </div>
          </div>

          <div className="glass-card rounded-[30px] p-5">
            <div className="rounded-[24px] border border-ledger/20 bg-ledger/10 p-5">
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-ledger">live architecture</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {TECH_BADGES.map((badge) => (
                  <span key={badge} className="rounded-2xl border border-white/10 bg-ink/40 px-3 py-3 text-sm text-paper">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Metric label="Agents" value="7" />
              <Metric label="Factors" value="6" />
              <Metric label="Guarded" value="100%" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CAPABILITIES.map(([title, desc]) => (
          <div key={title} className="glass-card rounded-[24px] p-5">
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-wheatSoft">{title}</div>
            <p className="mt-4 text-sm leading-6 text-mute">{desc}</p>
          </div>
        ))}
      </section>

      <section className="glass-panel rounded-[30px] p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-wheatSoft">visual pipeline</p>
            <h2 className="mt-2 font-display text-3xl text-paper">Buyer Query -&gt; Ranked Farmers</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-mute">
            A real multi-agent flow: Buyer Query -&gt; Intent Agent -&gt; Qdrant Retrieval -&gt; Ranking Agent -&gt; Safety Guard -&gt; Ranked Farmers.
          </p>
        </div>
        <PipelineStrip />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="font-mono text-2xl text-paper">{value}</div>
      <div className="mt-1 text-xs text-mute">{label}</div>
    </div>
  );
}
