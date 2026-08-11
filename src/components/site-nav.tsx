"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/country/IND", label: "India" },
  { href: "/rankings", label: "Rankings" },
  { href: "/explore", label: "Explore" },
  { href: "/compare", label: "Compare" },
  { href: "/report-card", label: "Report Card" },
  { href: "/methodology", label: "Methodology" },
  { href: "/chat", label: "Ask AI" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight hover:text-amber-600">
          India Dashboard
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-input p-1.5 text-muted-foreground transition-colors hover:text-foreground md:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t bg-background px-6 py-3 md:hidden">
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 transition-colors hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
