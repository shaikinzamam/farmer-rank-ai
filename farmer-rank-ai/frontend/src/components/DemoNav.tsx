"use client";

import Link from "next/link";
import { DemoRole, setDemoRole } from "@/lib/api";

const links: Array<{ href: string; role: DemoRole }> = [
  { href: "/buyer", role: "buyer" },
  { href: "/farmer", role: "farmer" },
  { href: "/admin", role: "admin" },
];

export function DemoNav() {
  return (
    <nav className="flex items-center gap-2 text-xs sm:text-sm text-mute font-mono">
      {links.map(({ href, role }) => (
        <Link
          key={role}
          href={href}
          onClick={() => setDemoRole(role)}
          className="rounded-full border border-white/10 px-3 py-1.5 hover:border-ledger/50 hover:text-paper transition-colors"
        >
          {role}
        </Link>
      ))}
    </nav>
  );
}
