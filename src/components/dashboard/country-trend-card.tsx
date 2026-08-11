"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Info, ExternalLink } from "lucide-react";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { eventsForIndicator } from "@/lib/historical-events";

type IndicatorOpt = { id: string; name: string; category: string; unit: string | null };

export function CountryTrendCard({
  country,
  countryName,
  indicators,
  initialId,
}: {
  country: string;
  countryName: string;
  indicators: IndicatorOpt[];
  initialId?: string;
}) {
  const [selectedId, setSelectedId] = useState(
    indicators.some((i) => i.id === initialId) ? initialId! : (indicators[0]?.id ?? ""),
  );
  const [countrySeries, setCountrySeries] = useState<Array<{ year: number; value: number | null }>>([]);
  const [indiaSeries, setIndiaSeries] = useState<Array<{ year: number; value: number | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byCategory = useMemo(() => {
    const map = new Map<string, IndicatorOpt[]>();
    for (const ind of indicators) {
      if (!map.has(ind.category)) map.set(ind.category, []);
      map.get(ind.category)!.push(ind);
    }
    return [...map.entries()];
  }, [indicators]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [a, b] = await Promise.all([
          fetch(`/api/indicators/series?country=${country}&indicator=${encodeURIComponent(selectedId)}`),
          fetch(`/api/indicators/series?country=IND&indicator=${encodeURIComponent(selectedId)}`),
        ]);
        if (!a.ok || !b.ok) throw new Error("Failed to load");
        const [ja, jb] = await Promise.all([a.json(), b.json()]);
        if (cancelled) return;
        setCountrySeries(ja.data ?? []);
        setIndiaSeries(jb.data ?? []);
      } catch {
        if (!cancelled) setError("Could not load trend data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [country, selectedId]);

  const current = indicators.find((i) => i.id === selectedId);
  const series = [
    { name: countryName, data: countrySeries, color: "#3b82f6" },
    { name: "India", data: indiaSeries, color: "#f59e0b" },
  ];
  const events = eventsForIndicator(selectedId, current?.category);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trend vs India</h2>
          <p className="text-sm text-muted-foreground">
            {current?.name ?? "Select an indicator"} over time.
          </p>
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full sm:w-72 rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        >
          {byCategory.map(([cat, inds]) => (
            <optgroup key={cat} label={cat.replace(/_/g, " ")}>
              {inds.map((ind) => (
                <option key={ind.id} value={ind.id}>{ind.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading data...
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}
      {!loading && !error && (
        <TrendChart title={current?.name ?? "Trend"} unit={current?.unit ?? undefined} series={series} height={320} />
      )}

      {!loading && !error && events.length > 0 && (
        <div className="mt-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-xs font-medium">What happened around these years — with sources</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {events.map((e) => (
              <span
                key={`${e.year}-${e.label}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs dark:bg-violet-900/20 dark:border-violet-800"
                title={e.description}
              >
                <span className="font-semibold text-violet-700 dark:text-violet-300 tabular-nums">{e.year}</span>
                <span className="font-medium">{e.label}</span>
                <a
                  href={e.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(ev) => ev.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-blue-500 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {e.sourceLabel}
                </a>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
