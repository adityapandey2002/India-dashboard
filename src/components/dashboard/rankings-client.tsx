"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fmtValue } from "@/lib/format";

type IndicatorOpt = { id: string; name: string; category: string };

type RankingRow = {
  iso3: string;
  value: number;
  year: number;
  rank: number;
  total: number;
  percentile: number;
};

type HistoryPoint = { year: number; rank: number; total: number };

type RankPayload = {
  indicator: { id: string; name: string; unit: string | null; category: string; description: string | null };
  higherIsBetter: boolean;
  ranking: RankingRow[];
  india: RankingRow | null;
  history: HistoryPoint[];
  names: Record<string, string>;
};

type SortKey = "rank" | "value" | "year" | "name";

export function RankingsClient({
  indicators,
  initialId,
}: {
  indicators: IndicatorOpt[];
  initialId?: string;
}) {
  const [selectedId, setSelectedId] = useState(initialId && indicators.some((i) => i.id === initialId) ? initialId : indicators[0]?.id ?? "");
  const [payload, setPayload] = useState<RankPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

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
        const res = await fetch(`/api/rankings?indicator=${encodeURIComponent(selectedId)}`);
        if (!res.ok) throw new Error("Failed to load");
        const data: RankPayload = await res.json();
        if (!cancelled) {
          setPayload(data);
          setQuery("");
          setSortKey("rank");
          setSortDir(1);
        }
      } catch {
        if (!cancelled) setError("Could not load rankings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedId]);

  const sorted = useMemo(() => {
    if (!payload) return [];
    const rows = [...payload.ranking];
    const dir = sortDir;
    rows.sort((a, b) => {
      switch (sortKey) {
        case "value": return (a.value - b.value) * dir;
        case "year":  return (a.year - b.year) * dir;
        case "name": {
          const na = payload.names[a.iso3] ?? a.iso3;
          const nb = payload.names[b.iso3] ?? b.iso3;
          return na.localeCompare(nb) * dir;
        }
        default: return (a.rank - b.rank) * dir;
      }
    });
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return rows.filter((r) => (payload.names[r.iso3] ?? r.iso3).toLowerCase().includes(q));
    }
    return rows;
  }, [payload, sortKey, sortDir, query]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(1); }
  }

  function renderSortHeader(label: string, k: SortKey, className?: string) {
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${className ?? ""}`}
      >
        {label}
        {sortKey === k ? (sortDir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    );
  }

  const indiaDelta = useMemo(() => {
    if (!payload || payload.history.length < 2) return null;
    const a = payload.history[payload.history.length - 2];
    const b = payload.history[payload.history.length - 1];
    return b.rank - a.rank;
  }, [payload]);

  const historyChart = useMemo(() => {
    if (!payload) return [];
    return payload.history.map((h) => ({ ...h, rank: h.rank }));
  }, [payload]);

  const current = indicators.find((i) => i.id === selectedId);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label htmlFor="rank-indicator" className="mb-1 block text-xs font-medium text-muted-foreground">
            Indicator
          </label>
          <div className="flex items-center gap-2">
            <select
              id="rank-indicator"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full sm:w-80 rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            >
              {byCategory.map(([cat, inds]) => (
                <optgroup key={cat} label={cat.replace(/_/g, " ")}>
                  {inds.map((ind) => (
                    <option key={ind.id} value={ind.id}>{ind.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {current && (
              <Link href={`/indicator/${current.id}`} className="shrink-0 text-xs text-blue-500 hover:underline">
                What is this? →
              </Link>
            )}
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries..."
            className="pl-9"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading rankings...
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && payload && (
        <>
          {/* India summary */}
          {payload.india && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <div className="text-xs text-muted-foreground">India rank</div>
                <div className="mt-1 text-2xl font-bold">
                  #{payload.india.rank}
                  <span className="text-sm font-normal text-muted-foreground"> / {payload.india.total}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {payload.india.year} · {payload.higherIsBetter ? "higher is better" : "lower is better"}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="text-xs text-muted-foreground">Percentile</div>
                <div className="mt-1 text-2xl font-bold">{payload.india.percentile.toFixed(0)}th</div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${payload.india.percentile}%` }}
                  />
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <div className="text-xs text-muted-foreground">Rank vs previous year</div>
                {indiaDelta == null ? (
                  <div className="mt-2 text-sm text-muted-foreground">Not enough history</div>
                ) : (
                  <>
                    <div className={`mt-1 text-2xl font-bold ${indiaDelta > 0 ? "text-red-600" : indiaDelta < 0 ? "text-green-600" : ""}`}>
                      {indiaDelta === 0 ? "—" : `${indiaDelta > 0 ? "+" : ""}${indiaDelta}`}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {indiaDelta > 0 ? "positions lost" : indiaDelta < 0 ? "positions gained" : "unchanged"}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* India rank over time */}
          {historyChart.length > 1 && (
            <div className="rounded-lg border bg-card p-4">
              <div className="mb-1 text-sm font-medium">India&apos;s rank over time</div>
              <div className="mb-3 text-xs text-muted-foreground">
                {current?.name} · rank 1 = best (top of chart)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={historyChart} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="year"
                    tickLine={false}
                    axisLine={false}
                    reversed
                    tick={{ fontSize: 11 }}
                    className="text-xs"
                  />
                  <YAxis
                    reversed
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                    width={44}
                    domain={["dataMin - 1", "dataMax + 1"]}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [name === "rank" ? `#${v} (lower better)` : String(v), name === "rank" ? "Rank" : String(name)]}
                    labelFormatter={(label) => `Year ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="rank"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Full ranking table */}
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">{renderSortHeader("Rank", "rank")}</TableHead>
                  <TableHead>{renderSortHeader("Country", "name")}</TableHead>
                  <TableHead className="text-right">{renderSortHeader("Value", "value")}</TableHead>
                  <TableHead className="text-right">{renderSortHeader("Year", "year")}</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Percentile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row) => (
                  <TableRow key={row.iso3} className={row.iso3 === "IND" ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.rank}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/country/${row.iso3}`} className="flex items-center gap-2 hover:text-amber-600 transition-colors">
                        {payload.names[row.iso3] ?? row.iso3}
                        {row.iso3 === "IND" && <Badge variant="default" className="bg-amber-500 hover:bg-amber-500">You</Badge>}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtValue(row.value, payload.indicator.unit)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{row.year}</TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      <div className="inline-flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{row.percentile.toFixed(0)}th</span>
                        <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted lg:block">
                          <div className="h-full rounded-full bg-amber-500" style={{ width: `${row.percentile}%` }} />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No countries match &ldquo;{query}&rdquo;
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer info */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>{payload.indicator.description ?? ""}</p>
            <p>
              {payload.ranking.length} countries · sorted by most recent year per country
              {query.trim() && ` · ${sorted.length} shown`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
