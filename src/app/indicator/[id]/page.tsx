import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Calculator, ExternalLink, Info, Globe, TrendingUp, TrendingDown, Minus, Calendar, Database, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { getAllIndicators, getAllCountries, getLatestSnapshot, getIndicatorSeries, getRankInYear, getLatestYear, getLeaderboard } from "@/lib/db/queries";
import { getGuide } from "@/lib/indicator-guides";
import { eventsForIndicator } from "@/lib/historical-events";
import { isHigherBetter } from "@/lib/rank-direction";
import { fmtValue } from "@/lib/format";

const INDIA = "IND";
const COMPARE_COUNTRIES = ["IND", "USA", "CHN", "BRA", "ZAF"];

export default async function IndicatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allIndicators = await getAllIndicators();
  const indicator = allIndicators.find((i) => i.id === id);
  if (!indicator) notFound();

  const [snapshot, countries, latestYear, related] = await Promise.all([
    getLatestSnapshot(INDIA),
    getAllCountries(),
    getLatestYear(id),
    Promise.resolve(allIndicators.filter((i) => i.category === indicator.category && i.id !== id).slice(0, 6)),
  ]);

  const snap = snapshot[id];
  const guide = getGuide(indicator);
  const events = eventsForIndicator(id, indicator.category);
  const higherBetter = isHigherBetter(id);

  const [rank, series] = await Promise.all([
    snap?.year ? getRankInYear(id, INDIA, snap.year, higherBetter) : Promise.resolve(null),
    Promise.all(COMPARE_COUNTRIES.map(async (iso3) => ({
      name: iso3 === INDIA ? "India" : (countries.find((c) => c.iso3 === iso3)?.name ?? iso3),
      data: (await getIndicatorSeries(iso3, id)).filter((p) => p.value != null).map((p) => ({ year: p.year, value: p.value! })),
    }))),
  ]);

  const year = latestYear ?? snap?.year ?? null;
  const leaderboard = year ? await getLeaderboard(id, year, 10, higherBetter) : [];
  const countryByIso = new Map(countries.map((c) => [c.iso3, c.name]));
  const indiaRow = leaderboard.find((r) => r.iso3 === INDIA);

  // Trend: last value vs previous year
  const indiaSeries = series.find((s) => s.name === "India")?.data ?? [];
  const lastPt = indiaSeries[indiaSeries.length - 1];
  const prevPt = indiaSeries[indiaSeries.length - 2];
  let trendLabel: string | null = null;
  let trendPct: number | null = null;
  let improving = false;
  if (lastPt && prevPt && prevPt.value !== 0) {
    const pct = ((lastPt.value - prevPt.value) / Math.abs(prevPt.value)) * 100;
    trendPct = pct;
    improving = higherBetter ? pct >= 0 : pct < 0;
    trendLabel = `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% (vs ${prevPt.year})`;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8 sm:px-6 sm:py-10">
        {/* Breadcrumb + header */}
        <div className="space-y-3">
          <Link href="/explore" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            All indicators
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">{indicator.category.replace(/_/g, " ")}</Badge>
            <Badge variant="secondary">{indicator.source}</Badge>
            {indicator.unit && <Badge variant="outline">{indicator.unit}</Badge>}
            <span className={`text-xs font-medium ${higherBetter ? "text-emerald-600" : "text-red-500"}`}>
              {higherBetter ? "↑ higher is better" : "↓ lower is better"}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{indicator.name}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{indicator.id}</span>
            {indicator.sourceId && <span className="font-mono"> · {indicator.sourceId}</span>}
            {indicator.updateFreq && <> · updated {indicator.updateFreq}</>}
          </p>
        </div>

        {/* India snapshot */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">India latest</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{fmtValue(snap?.value ?? null, indicator.unit)}</p>
              <p className="text-xs text-muted-foreground">{snap?.year ?? "no data"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Global rank</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {rank ? `#${rank.rank}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{rank ? `of ${rank.total} countries` : "no data"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Recent trend</p>
              <div className="mt-1 flex items-center gap-2">
                {trendPct != null ? (
                  <>
                    {trendPct >= 0 ? (
                      <TrendingUp className={`h-5 w-5 ${improving ? "text-emerald-600" : "text-red-500"}`} />
                    ) : (
                      <TrendingDown className={`h-5 w-5 ${improving ? "text-emerald-600" : "text-red-500"}`} />
                    )}
                    <span className={`text-lg font-semibold tabular-nums ${improving ? "text-emerald-600" : "text-red-500"}`}>{trendLabel}</span>
                  </>
                ) : (
                  <Minus className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">World rank of India (top 10)</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {indiaRow ? `#${leaderboard.findIndex((r) => r.iso3 === INDIA) + 1}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">in {year ?? "latest"} year</p>
            </CardContent>
          </Card>
        </div>

        {/* In simple words */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-amber-500" />
              In simple words
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{guide.simpleWords}</p>
            {indicator.description && indicator.description !== guide.simpleWords && (
              <p className="mt-2 text-sm text-muted-foreground">{indicator.description}</p>
            )}
          </CardContent>
        </Card>

        {/* How it is calculated */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-amber-500" />
              How is it calculated?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{guide.calculation}</p>
          </CardContent>
        </Card>

        {/* Trend chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-500" />
                India vs selected countries
              </span>
              <Link href={`/compare?indicator=${indicator.id}`} className="text-xs text-blue-500 hover:underline">
                Open in Compare →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart title={indicator.name} unit={indicator.unit ?? undefined} series={series} height={320} />
          </CardContent>
        </Card>

        {/* Historical events */}
        {events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-violet-500" />
                What moved this number — with sources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {events.map((e) => (
                <div key={`${e.year}-${e.label}`} className="text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 text-xs font-semibold tabular-nums">{e.year}</span>
                    <span className="font-medium">{e.label}</span>
                    <a href={e.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline">
                      <ExternalLink className="h-3 w-3" /> {e.sourceLabel}
                    </a>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{e.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Top 10 world ranking */}
        {leaderboard.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-amber-500" />
                Top 10 countries in {year ?? "latest"} ({higherBetter ? "highest" : "lowest"} values shown)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Rank</th>
                    <th className="px-4 py-2 font-medium">Country</th>
                    <th className="px-4 py-2 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((r, i) => (
                    <tr key={r.iso3} className={`border-b last:border-0 ${r.iso3 === INDIA ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
                      <td className="px-4 py-2 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2">
                        <Link href={`/country/${r.iso3}`} className={`hover:text-blue-500 ${r.iso3 === INDIA ? "font-semibold" : ""}`}>
                          {countryByIso.get(r.iso3) ?? r.iso3} {r.iso3 === INDIA && <Badge variant="secondary" className="ml-1 text-xs">India</Badge>}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtValue(r.value, indicator.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Learn more */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-amber-500" />
              Learn more
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {guide.learnMore.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link href="/methodology" className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:underline">
                  <Database className="h-3.5 w-3.5" />
                  How indicators are calculated (methodology)
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Related indicators */}
        {related.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold capitalize">Related indicators</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((rel) => (
                <Link key={rel.id} href={`/indicator/${rel.id}`} className="rounded-lg border p-4 transition-colors hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20">
                  <p className="truncate text-sm font-medium">{rel.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rel.unit ?? "index"}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
