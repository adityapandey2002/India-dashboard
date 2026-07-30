"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Sparkles, X } from "lucide-react";

type Country = { iso3: string; name: string; region: string | null };
type Indicator = { id: string; name: string; category: string; unit: string | null };

type Props = {
  countries: Country[];
  indicatorsByCategory: Record<string, Indicator[]>;
};

const DEFAULT_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];
const DEFAULT_COUNTRIES = ["IND", "USA", "CHN", "BRA", "ZAF"];

type SeriesPoint = { year: number; value: number };

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

export function CompareTool({ countries, indicatorsByCategory }: Props) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>(DEFAULT_COUNTRIES);
  const [selectedIndicator, setSelectedIndicator] = useState("gdp_current_usd");
  const [seriesData, setSeriesData] = useState<Record<string, SeriesPoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const countryMap = new Map(countries.map((c) => [c.iso3, c.name]));
  const allIndicators = Object.values(indicatorsByCategory).flat();
  const currentIndicator = allIndicators.find((i) => i.id === selectedIndicator);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          selectedCountries.map(async (iso3) => {
            const res = await fetch(`/api/indicators/series?country=${iso3}&indicator=${selectedIndicator}`);
            if (!res.ok) throw new Error(`Failed to fetch data for ${iso3}`);
            const json = await res.json();
            return { iso3, points: (json.points ?? []).filter((p: { value: number | null }) => p.value != null) as SeriesPoint[] };
          }),
        );
        if (cancelled) return;
        const data: Record<string, SeriesPoint[]> = {};
        for (const r of results) {
          data[r.iso3] = r.points;
        }
        setSeriesData(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedCountries, selectedIndicator]);

  const toggleCountry = (iso3: string) => {
    setSelectedCountries((prev) =>
      prev.includes(iso3) ? prev.filter((c) => c !== iso3) : [...prev, iso3],
    );
  };

  const chartData = (() => {
    const years = new Set<number>();
    for (const pts of Object.values(seriesData)) {
      for (const p of pts) years.add(p.year);
    }
    return Array.from(years).sort((a, b) => a - b).map((year) => {
      const row: Record<string, number | null> = { year };
      for (const [iso3, pts] of Object.entries(seriesData)) {
        const p = pts.find((d) => d.year === year);
        row[countryMap.get(iso3) ?? iso3] = p?.value ?? null;
      }
      return row;
    });
  })();

  const latestYear = chartData.length > 0 ? chartData[chartData.length - 1].year as number : null;
  const barData = latestYear
    ? selectedCountries
        .filter((iso3) => seriesData[iso3]?.some((p) => p.year === latestYear))
        .map((iso3) => ({
          name: countryMap.get(iso3) ?? iso3,
          value: seriesData[iso3]?.find((p) => p.year === latestYear)?.value ?? null,
          iso3,
        }))
        .filter((d) => d.value != null)
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    : [];

  // Radar chart data: normalize values to 0-100 scale for comparison
  const radarCountries = selectedCountries.filter((iso3) => seriesData[iso3]?.some((p) => p.year === latestYear));
  const radarData = radarCountries.map((iso3) => {
    const val = seriesData[iso3]?.find((p) => p.year === latestYear)?.value ?? 0;
    return { name: countryMap.get(iso3) ?? iso3, [iso3]: val };
  });
  // Add an aggregate "max" row for radar scaling
  const maxVal = Math.max(...radarData.map((r) => Object.values(r)[1] as number));
  const minVal = Math.min(...radarData.map((r) => Object.values(r)[1] as number));
  const radarDataWithScale = radarData.map((r) => {
    const raw = Object.values(r)[1] as number;
    return { name: r.name, [Object.keys(r)[1]]: maxVal > minVal ? ((raw - minVal) / (maxVal - minVal)) * 100 : 50 };
  });

  const loadInsight = async () => {
    if (!currentIndicator) return;
    setInsightLoading(true);
    setInsight(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `How does India compare to ${selectedCountries.filter((c) => c !== "IND").map((c) => countryMap.get(c)).join(", ")} on ${currentIndicator.name}? What are the key takeaways?`,
        }),
      });
      const json = await res.json();
      setInsight(json.answer ?? json.error ?? "AI insight unavailable. Set GROQ_API_KEY.");
    } catch {
      setInsight("Failed to load AI insight.");
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select countries</label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search countries..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent pl-9 pr-8 py-2 text-sm"
              />
              {countrySearch && (
                <button onClick={() => setCountrySearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {countries
                .filter((c) => !countrySearch || c.name.toLowerCase().includes(countrySearch.toLowerCase()))
                .map((c) => (
                <button
                  key={c.iso3}
                  onClick={() => toggleCountry(c.iso3)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedCountries.includes(c.iso3)
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-card text-muted-foreground border-border hover:border-blue-300"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedCountries.length} selected &middot; {countries.length} total
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Select indicator</label>
            <select
              value={selectedIndicator}
              onChange={(e) => setSelectedIndicator(e.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            >
              {Object.entries(indicatorsByCategory).map(([category, inds]) => (
                <optgroup key={category} label={category.replace(/_/g, " ")}>
                  {inds.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading data...
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Chart */}
      {!loading && !error && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{currentIndicator?.name ?? selectedIndicator}</span>
              {currentIndicator?.unit && (
                <Badge variant="secondary" className="text-xs">{currentIndicator.unit}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} className="text-xs" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => v != null && typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {selectedCountries.map((iso3, i) => (
                    <Line
                      key={iso3}
                      type="monotone"
                      dataKey={countryMap.get(iso3) ?? iso3}
                      stroke={DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                      strokeWidth={iso3 === "IND" ? 3 : 1.5}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {barData.length > 0 && (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} className="text-xs" tick={{ fontSize: 11 }} width={60} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => v != null && typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, idx) => (
                        <Cell key={entry.iso3} fill={entry.iso3 === "IND" ? "#f59e0b" : DEFAULT_COLORS[idx % DEFAULT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Radar Chart + Delta Highlights */}
      {!loading && !error && chartData.length > 0 && barData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Radar comparison & deltas</span>
              {currentIndicator?.unit && (
                <Badge variant="secondary" className="text-xs">{currentIndicator.unit}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart cx="50%" cy="50%" innerRadius={40} outerRadius={120} data={radarData}>
                  <PolarGrid gridType="polygon" stroke="hsl(var(--muted))" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} tick={{ fontSize: 10 }} domain={[0, "dataMax + 10"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => v != null && typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {radarCountries.map((iso3, i) => (
                    <Radar
                      key={iso3}
                      name={countryMap.get(iso3) ?? iso3}
                      dataKey={iso3}
                      stroke={DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                      fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                      fillOpacity={0.15}
                      strokeWidth={iso3 === "IND" ? 2 : 1.5}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">Delta vs India (latest year: {latestYear})</h4>
                {barData.length > 1 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {barData
                      .filter((d) => d.iso3 !== "IND")
                      .map((d) => {
                        const dVal = d.value ?? 0;
                        const indiaVal = barData.find((b) => b.iso3 === "IND")?.value ?? 0;
                        const diff = dVal - indiaVal;
                        const pct = indiaVal !== 0 ? ((diff / indiaVal) * 100).toFixed(1) : "∞";
                        const isBetter = diff > 0;
                        return (
                          <div key={d.iso3} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${d.iso3 === "IND" ? "bg-amber-500" : DEFAULT_COLORS[barData.indexOf(d) % DEFAULT_COLORS.length]}`} />
                              <Link href={`/country/${d.iso3}`} className="font-medium text-sm hover:text-blue-500 transition-colors">{d.name}</Link>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-sm">
                                {isBetter ? "+" : ""}{diff.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </div>
                              <div className={`text-xs font-mono ${isBetter ? "text-green-600" : "text-red-600"}`}>
                                ({pct}% vs India)
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      {!loading && !error && Object.keys(seriesData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data table</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  {selectedCountries.map((iso3) => (
                    <TableHead key={iso3} className="text-right">
                      <Link href={`/country/${iso3}`} className="hover:text-blue-500 transition-colors">{countryMap.get(iso3) ?? iso3}</Link>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((row) => (
                  <TableRow key={row.year as number}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.year as number}</TableCell>
                    {selectedCountries.map((iso3) => (
                      <TableCell key={iso3} className="text-right font-mono tabular-nums text-sm">
                        {fmtValue(row[countryMap.get(iso3) ?? iso3] as number | null, currentIndicator?.unit)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* AI insight */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              AI insight
            </span>
            <button
              onClick={loadInsight}
              disabled={insightLoading}
              className="text-xs text-blue-500 hover:text-blue-600 disabled:opacity-50"
            >
              {insightLoading ? "Thinking..." : "Generate insight"}
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insight ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{insight}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click &ldquo;Generate insight&rdquo; to get an AI-powered analysis of this comparison.
              {!process.env.NEXT_PUBLIC_GROQ_KEY && " Set GROQ_API_KEY in your environment to enable."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
