import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Farmer Rank AI",
  description: "Agentic discovery, ranking, and explanation for agricultural procurement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen spatial-shell">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/58 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-5">
            <Link href="/" className="font-display text-2xl tracking-tight text-paper">
              Farmer Rank <span className="text-ledger">AI</span>
            </Link>
            <nav className="flex items-center gap-2 text-xs sm:text-sm text-mute font-mono">
              <Link href="/buyer" className="rounded-full border border-white/10 px-3 py-1.5 hover:border-ledger/50 hover:text-paper transition-colors">
                buyer
              </Link>
              <Link href="/farmer" className="rounded-full border border-white/10 px-3 py-1.5 hover:border-ledger/50 hover:text-paper transition-colors">
                farmer
              </Link>
              <Link href="/admin" className="rounded-full border border-white/10 px-3 py-1.5 hover:border-ledger/50 hover:text-paper transition-colors">
                admin
              </Link>
            </nav>
          </div>
        </header>
        <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-12">{children}</main>
      </body>
    </html>
  );
}
