import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Minus, Globe, Database, BarChart3, Calendar, Building2, Users, Shield, Zap, BookOpen, Stethoscope, Leaf, Heart, ArrowLeft, Trophy, AlertTriangle, type LucideIcon } from "lucide-react";
import { getAllIndicators, getAllCountries, getLatestSnapshot, getCountryHistory, getLatestRanks } from "@/lib/db/queries";
import { indicatorScore, average, gradeFor, prevValueInSeries } from "@/lib/report-card";
import { fmtValue } from "@/lib/format";
import { CountryRadar } from "@/components/dashboard/country-radar";
import { CountryTrendCard } from "@/components/dashboard/country-trend-card";
import { CountryInsight } from "@/components/dashboard/country-insight";
import { computeTrend } from "@/lib/trend";

const ICONS: Record<string, LucideIcon> = {
  economy: Building2, society: Users, governance: Shield,
  technology: Zap, education: BookOpen, healthcare: Stethoscope,
  environment: Leaf, safety: Shield, equality: Heart, digital_gov: Globe,
};

function Sparkline({ data }: { data: { year: number; value: number | null }[] }) {
  const pts = data.filter((d): d is { year: number; value: number } => d.value != null);
  if (pts.length < 2) return null;
  const vals = pts.map(d => d.value);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const rng = mx - mn || 1;
  const w = 80, h = 24;
  const px = (i: number) => (i / (pts.length - 1)) * w;
  const py = (v: number) => h - ((v - mn) / rng) * (h - 2) - 1;
  const d = vals.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(0)},${py(v).toFixed(0)}`).join("");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Trend = { icon: LucideIcon; color: string; label: string } | null;

function getTrend(current: number | null, previous: number | null): Trend {
  const t = computeTrend(current, previous);
  if (!t) return null;
  if (t.direction === "flat") return { icon: Minus, color: "text-muted-foreground", label: "Stable" };
  return t.direction === "up"
    ? { icon: ArrowUpRight, color: "text-green-600", label: `+${t.pct.toFixed(1)}%` }
    : { icon: ArrowDownRight, color: "text-red-600", label: `${t.pct.toFixed(1)}%` };
}

type Entry = {
  id: string; name: string; category: string; unit: string | null;
  value: number | null; year: number | null; score: number | null;
  rank: { rank: number; total: number } | null; trend: Trend; series: Array<{ year: number; value: number | null }>;
};

export default async function CountryPage({ params, searchParams }: { params: Promise<{ iso3: string }>; searchParams: Promise<{ indicator?: string }> }) {
  const { iso3 } = await params;
  const { indicator } = await searchParams;
  const code = iso3.toUpperCase();

  const [countries, allIndicators] = await Promise.all([
    getAllCountries(),
    getAllIndicators(),
  ]);

  const country = countries.find((c) => c.iso3 === code);
  if (!country) notFound();

  const [snapshot, history, ranks] = await Promise.all([
    getLatestSnapshot(code),
    getCountryHistory(code),
    getLatestRanks(allIndicators.map((i) => i.id), [code, "IND"]),
  ]);

  const historyByIndicator = new Map<string, Array<{ year: number; value: number | null }>>();
  for (const p of history) {
    const arr = historyByIndicator.get(p.indicatorId) ?? [];
    arr.push({ year: p.year, value: p.value });
    historyByIndicator.set(p.indicatorId, arr);
  }

  const rankByCountry = new Map<string, Map<string, { rank: number; total: number }>>();
  for (const r of ranks) {
    let m = rankByCountry.get(r.countryIso3);
    if (!m) { m = new Map(); rankByCountry.set(r.countryIso3, m); }
    m.set(r.indicatorId, { rank: r.rank, total: r.total });
  }
  const codeRanks = rankByCountry.get(code) ?? new Map<string, { rank: number; total: number }>();
  const indiaRanks = rankByCountry.get("IND") ?? new Map<string, { rank: number; total: number }>();

  const categories = [...new Set(allIndicators.map((i) => i.category))];

  const data = categories.map((cat) => {
    const entries: Entry[] = allIndicators
      .filter((i) => i.category === cat)
      .map((ind) => {
        const val = snapshot[ind.id];
        const series = historyByIndicator.get(ind.id) ?? [];
        const lastVal = val?.value ?? null;
        const year = val?.year ?? null;
        const rank = codeRanks.get(ind.id) ?? null;
        const score = rank ? indicatorScore(rank.rank, rank.total) : null;
        const prev = year != null ? prevValueInSeries(series, year) : null;
        return {
          ...ind,
          value: lastVal,
          year,
          score,
          rank,
          trend: getTrend(lastVal, prev),
          series,
        };
      })
      .filter((e) => e.value != null);
    return { category: cat, entries };
  });

  // Category scores for this country vs India
  const catScores = categories.map((cat) => {
    const countryScores: number[] = [];
    const indiaScores: number[] = [];
    for (const ind of allIndicators) {
      if (ind.category !== cat) continue;
      const c = codeRanks.get(ind.id);
      const i = indiaRanks.get(ind.id);
      if (c) countryScores.push(indicatorScore(c.rank, c.total));
      if (i) indiaScores.push(indicatorScore(i.rank, i.total));
    }
    return {
      category: cat,
      country: average(countryScores),
      india: average(indiaScores),
    };
  });

  const overallScore = average(catScores.map((c) => c.country).filter((s): s is number => s != null));
  const grade = overallScore != null ? gradeFor(overallScore) : null;

  const radarData = catScores
    .filter((c) => c.country != null && c.india != null)
    .map((c) => ({
      category: c.category.replace(/_/g, " "),
      Country: Math.round(c.country!),
      India: Math.round(c.india!),
    }));

  const ranked = data.flatMap((d) => d.entries).filter((e) => e.score != null && e.rank != null);
  const best = [...ranked].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3);
  const worst = [...ranked].sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 3);

  const trendIndicators = data
    .flatMap((d) => d.entries)
    .map((e) => ({ id: e.id, name: e.name, category: e.category, unit: e.unit }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalDataPoints = data.reduce((sum, c) => sum + c.entries.length, 0);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8 sm:px-6 sm:py-10">
        {/* Back + Header */}
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{country.name}</h1>
              <p className="text-muted-foreground">
                {code} &middot; {country.region ?? "No region"} &middot; {totalDataPoints} indicators with data
              </p>
            </div>
            <div className="flex items-center gap-2">
              {grade && (
                <Badge variant="outline" className={`text-base ${grade.color}`}>{grade.letter}</Badge>
              )}
              <Link href={`/compare?country=${code}`}>
                <Badge variant="outline" className="gap-1 cursor-pointer hover:border-amber-400">
                  <BarChart3 className="h-3 w-3" />
                  Compare
                </Badge>
              </Link>
            </div>
          </div>
          {overallScore != null && (
            <p className="text-sm text-muted-foreground">
              Overall global score: <span className="font-semibold text-foreground">{overallScore.toFixed(1)} / 100</span> — {grade?.label}
            </p>
          )}
        </div>

        {/* Radar vs India */}
        {radarData.length > 0 && <CountryRadar data={radarData} countryName={country.name} />}

        {/* Best / Worst highlights */}
        {(best.length > 0 || worst.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {best.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm text-green-700">
                    <Trophy className="h-4 w-4" /> Top performers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {best.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-amber-300 hover:bg-amber-50/50">
                      <div className="min-w-0">
                        <Link href={`/indicator/${e.id}`} className="truncate block text-sm font-medium hover:text-amber-700">
                          {e.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{fmtValue(e.value, e.unit)} · {e.year}</p>
                        <Link href={`/compare?indicator=${e.id}`} className="text-xs text-blue-500 hover:underline">Compare →</Link>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-green-600">#{e.rank!.rank}</span>
                        <span className="text-xs text-muted-foreground">/{e.rank!.total}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {worst.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4" /> Bottom performers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {worst.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-amber-300 hover:bg-amber-50/50">
                      <div className="min-w-0">
                        <Link href={`/indicator/${e.id}`} className="truncate block text-sm font-medium hover:text-amber-700">
                          {e.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{fmtValue(e.value, e.unit)} · {e.year}</p>
                        <Link href={`/compare?indicator=${e.id}`} className="text-xs text-blue-500 hover:underline">Compare →</Link>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-red-600">#{e.rank!.rank}</span>
                        <span className="text-xs text-muted-foreground">/{e.rank!.total}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Interactive trend vs India */}
        {trendIndicators.length > 0 && (
          <CountryTrendCard country={code} countryName={country.name} indicators={trendIndicators} initialId={indicator} />
        )}

        {/* AI analysis */}
        <CountryInsight iso3={code} countryName={country.name} />

        {/* Category Panels */}
        {data.map(({ category, entries }) => {
          if (entries.length === 0) return null;
          const Icon = ICONS[category] || Globe;
          const cat = catScores.find((c) => c.category === category);
          return (
            <section key={category}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Icon className="h-5 w-5 text-amber-500" />
                <Link href={`/explore?category=${category}`} className="text-lg font-semibold capitalize hover:text-amber-600 transition-colors">{category.replace(/_/g, " ")}</Link>
                <span className="text-xs text-muted-foreground">({entries.length})</span>
                {cat?.country != null && (
                  <Badge variant="secondary" className="text-xs">score {cat.country.toFixed(0)}</Badge>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="group rounded-lg border p-4 transition-colors hover:border-amber-400 hover:bg-amber-50/50 dark:hover:border-amber-600 dark:hover:bg-amber-950/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/indicator/${entry.id}`}
                          className="truncate text-sm font-medium block group-hover:text-amber-700 dark:group-hover:text-amber-300"
                        >
                          {entry.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{entry.id}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">{entry.unit ?? "index"}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-2xl font-bold tracking-tight">{fmtValue(entry.value, null)}</span>
                      <div className="flex items-center gap-2">
                        <Sparkline data={entry.series} />
                        {entry.trend && (
                          <div className="flex items-center gap-1">
                            <entry.trend.icon className={`${entry.trend.color} h-4 w-4`} />
                            <span className={`text-xs font-mono ${entry.trend.color}`}>{entry.trend.label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {entry.year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {entry.year}
                        </span>
                      )}
                      {entry.rank && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          #{entry.rank.rank} of {entry.rank.total}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {entry.series.length} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
