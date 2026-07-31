"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { TrendChart } from "@/components/dashboard/trend-chart";

type IndicatorOpt = { id: string; name: string; category: string; unit: string | null };

export function CountryTrendCard({
  country,
  countryName,
  indicators,
}: {
  country: string;
  countryName: string;
  indicators: IndicatorOpt[];
}) {
  const [selectedId, setSelectedId] = useState(indicators[0]?.id ?? "");
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
    </div>
  );
}
