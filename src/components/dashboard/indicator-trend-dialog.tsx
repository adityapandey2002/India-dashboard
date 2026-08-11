"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Loader2, ExternalLink, TrendingUp, TrendingDown, Info } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { eventsForIndicator } from "@/lib/historical-events";
import { isHigherBetter } from "@/lib/rank-direction";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicatorId: string;
  indicatorName: string;
  category: string;
  unit?: string | null;
  description?: string | null;
};

type Point = { year: number; value: number | null };

export function IndicatorTrendDialog({ open, onOpenChange, indicatorId, indicatorName, category, unit, description }: Props) {
  const [data, setData] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !indicatorId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const res = await fetch(`/api/indicators/series?country=IND&indicator=${encodeURIComponent(indicatorId)}`);
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        if (!cancelled) {
          setData((json.data ?? []).filter((p: Point) => p.value != null));
        }
      } catch {
        if (!cancelled) setError("Could not load trend data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, indicatorId]);

  const events = eventsForIndicator(indicatorId, category);
  const higherBetter = isHigherBetter(indicatorId);
  const change = data.length >= 2 ? data[data.length - 1].value! - data[data.length - 2].value! : 0;
  const last = data[data.length - 1]?.value;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg pr-8">
            <span className="inline-flex items-center gap-2">
              {indicatorName}
              <a
                href={`/indicator/${indicatorId}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline font-normal"
              >
                view details
                <ExternalLink className="h-3 w-3" />
              </a>
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {unit && <Badge variant="secondary" className="text-xs capitalize">{unit}</Badge>}
              <Badge variant="outline" className="text-xs capitalize">{category.replace(/_/g, " ")}</Badge>
              <span className={`text-xs font-medium ${higherBetter ? "text-emerald-600" : "text-red-500"}`}>
                {higherBetter ? "higher is better" : "lower is better"}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading India&apos;s trend...
          </div>
        )}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>}
        {!loading && !error && data.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Latest ({data[data.length - 1].year})</span>
                <span className="ml-2 font-semibold tabular-nums">
                  {last != null ? last.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                  {unit ? ` ${unit}` : ""}
                </span>
              </div>
              <div className={`flex items-center gap-1 ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="font-medium tabular-nums">
                  {change >= 0 ? "+" : ""}{change.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-muted-foreground text-xs">vs {data[data.length - 2].year}</span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={70}
                    domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => (v != null && typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—")}
                  />
                  <Line type="monotone" dataKey="value" name="India" stroke="#f59e0b" strokeWidth={2.5} dot={false} connectNulls />
                  {events.map((e) => (
                    <ReferenceLine key={`${e.year}-${e.label}`} x={e.year} stroke="#8b5cf6" strokeDasharray="4 4" strokeOpacity={0.6} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {events.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-violet-500" />
                  <h4 className="font-medium text-sm">What moved the numbers — with sources</h4>
                </div>
                <div className="space-y-3">
                  {events.map((e) => (
                    <div key={`${e.year}-${e.label}`} className="text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-xs font-semibold tabular-nums">
                          {e.year}
                        </span>
                        <span className="font-medium">{e.label}</span>
                        <a
                          href={e.source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> {e.sourceLabel}
                        </a>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">{e.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
