"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Globe, Building2, Users, Shield, Zap, BookOpen, Stethoscope, Leaf, Heart, ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ICONS: Record<string, LucideIcon> = {
  economy: Building2,
  society: Users,
  governance: Shield,
  technology: Zap,
  education: BookOpen,
  healthcare: Stethoscope,
  environment: Leaf,
  safety: Shield,
  equality: Heart,
  digital_gov: Globe,
};

type Entry = {
  id: string;
  name: string;
  category: string;
  unit: string | null;
  value: number | null;
  year: number | null;
  rank: number | null;
  total: number | null;
  score: number | null;
  trend: { icon: "up" | "down" | "flat"; color: string; label: string } | null;
};

type Section = {
  category: string;
  score: number | null;
  gradeLetter: string | null;
  gradeColor: string | null;
  entries: Entry[];
};

function fmtValue(v: number | null, unit?: string | null): string {
  if (v == null) return "—";
  let s: string;
  if (Math.abs(v) >= 1e12) s = `${(v / 1e12).toFixed(2)}T`;
  else if (Math.abs(v) >= 1e9) s = `${(v / 1e9).toFixed(2)}B`;
  else if (Math.abs(v) >= 1e6) s = `${(v / 1e6).toFixed(2)}M`;
  else if (Math.abs(v) >= 1e3) s = `${(v / 1e3).toFixed(1)}k`;
  else s = v.toFixed(unit === "%" ? 1 : 0);
  return unit ? `${s} ${unit}` : s;
}

function TrendIcon({ kind, className }: { kind: "up" | "down" | "flat"; className: string }) {
  if (kind === "up") return <ArrowUpRight className={className} />;
  if (kind === "down") return <ArrowDownRight className={className} />;
  return <Minus className={className} />;
}

export function ReportCardSections({ sections }: { sections: Section[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sections.forEach((s, i) => { init[s.category] = i === 0; });
    return init;
  });

  const toggle = (cat: string) => setOpen((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <div className="space-y-4">
      {sections.map(({ category, score, gradeLetter, gradeColor, entries }) => {
        const Icon = ICONS[category] || Globe;
        const isOpen = !!open[category];
        return (
          <Card key={category} className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(category)}
              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-expanded={isOpen}
            >
              <CardHeader className="bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-amber-500" />
                    <span className="capitalize">{category.replace(/_/g, " ")}</span>
                    {score != null && gradeLetter && (
                      <Badge variant="outline" className={`ml-1 ${gradeColor ?? ""}`}>
                        {gradeLetter} · {score.toFixed(0)}
                      </Badge>
                    )}
                    <span className="text-xs font-normal text-muted-foreground">
                      {entries.length} indicator{entries.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {score != null && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-xs font-medium text-muted-foreground">Score</span>
                        <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${score >= 55 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(100, score)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </CardTitle>
              </CardHeader>
            </button>
            {isOpen && (
              <CardContent className="space-y-3 p-6">
                {entries.map((entry) => {
                  const rankColor = entry.rank !== null
                    ? entry.rank <= Math.ceil((entry.total ?? 100) * 0.1) ? "text-green-600"
                    : entry.rank <= Math.ceil((entry.total ?? 100) * 0.25) ? "text-amber-600"
                    : entry.rank <= Math.ceil((entry.total ?? 100) * 0.5) ? "text-blue-600"
                    : "text-red-600"
                    : "text-muted-foreground";
                  return (
                    <Link
                      key={entry.id}
                      href={`/indicator/${entry.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border rounded-lg hover:border-amber-200 hover:bg-amber-50/40 dark:hover:bg-amber-950/10 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-base group-hover:text-amber-700 hover:text-amber-700 transition-colors">{entry.name}</span>
                          <Badge variant="secondary" className="text-xs">{entry.unit ?? "index"}</Badge>
                          {entry.year && <span className="text-xs text-muted-foreground">({entry.year})</span>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Value: <span className="font-mono font-medium">{fmtValue(entry.value, entry.unit ?? undefined)}</span>
                        </p>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1 text-right">
                        {entry.rank !== null && entry.total !== null && (
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-lg ${rankColor}`}>#{entry.rank}</span>
                            <span className="text-xs text-muted-foreground">of {entry.total}</span>
                          </div>
                        )}
                        {entry.trend && (
                          <div className="flex items-center gap-1">
                            <TrendIcon kind={entry.trend.icon} className={`${entry.trend.color} h-4 w-4`} />
                            <span className={`font-mono text-sm ${entry.trend.color}`}>{entry.trend.label}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
