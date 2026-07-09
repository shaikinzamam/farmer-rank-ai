import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="font-mono text-xs uppercase tracking-widest text-wheatSoft mb-3">
          agentic procurement · think · retrieve · remember · evaluate · act
        </p>
        <h1 className="font-display text-5xl leading-tight text-paper max-w-2xl">
          Rank farmers the way a trusted mandi broker would —
          <span className="text-wheat"> if that broker showed their work.</span>
        </h1>
        <p className="text-mute max-w-xl mt-4 leading-relaxed">
          A buyer describes what they need in plain language. A pipeline of
          specialized agents parses the request, searches a live vector index
          of crop listings, scores every candidate against a fixed weighted
          formula, writes a plain-language justification, and passes the
          whole thing through a safety gate before it reaches you.
        </p>
        <div className="flex gap-4 mt-8">
          <Link href="/buyer" className="px-5 py-2.5 bg-wheat text-ink font-medium rounded-sm hover:bg-wheat/90 transition-colors">
            Try a buyer query
          </Link>
          <Link href="/farmer" className="px-5 py-2.5 border border-hairline text-paper rounded-sm hover:border-wheat transition-colors">
            List a crop
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-5 gap-px bg-hairline rounded-sm overflow-hidden mt-4">
        {[
          ["Think", "Intent Agent parses free-text requirements into a structured spec."],
          ["Retrieve", "Retrieval Agent runs semantic search over Qdrant's farmer_listings."],
          ["Remember", "Memory Agent recalls similar past matches to bias ranking toward proven outcomes."],
          ["Evaluate", "Ranking Agent applies the fixed six-factor weighted formula."],
          ["Act", "Explanation + Safety Agents produce a guarded, auditable justification."],
        ].map(([title, desc]) => (
          <div key={title} className="bg-surface p-5">
            <div className="font-mono text-xs text-ledger mb-2">{title}</div>
            <p className="text-sm text-mute leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
