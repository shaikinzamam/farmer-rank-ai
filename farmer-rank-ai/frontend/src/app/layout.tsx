import type { Metadata } from "next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const display = Newsreader({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600"] });
const body = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Farmer Rank AI",
  description: "Agentic discovery, ranking, and explanation for agricultural procurement.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body min-h-screen">
        <header className="border-b border-hairline">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/buyer" className="font-display text-xl tracking-tight text-paper">
              Farmer Rank <span className="text-wheat">AI</span>
            </Link>
            <nav className="flex gap-6 text-sm text-mute font-mono">
              <Link href="/buyer" className="hover:text-wheat transition-colors">buyer</Link>
              <Link href="/farmer" className="hover:text-wheat transition-colors">farmer</Link>
              <Link href="/admin" className="hover:text-wheat transition-colors">admin</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
