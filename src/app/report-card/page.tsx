export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { ReportCardRadar } from "@/components/dashboard/report-card-radar";
import { ArrowUpRight, ArrowDownRight, Minus, FileText, Calendar, Globe, BarChart2, Heart, Shield, Leaf, Zap, Users, Building2, BookOpen, Stethoscope, TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { getDashboardStats, getLatestSnapshot, getAllIndicators, getCountryHistory, getLatestRanks } from "@/lib/db/queries";
import { indicatorScore, average, gradeFor, prevValueInSeries, type Grade } from "@/lib/report-card";

const INDIA = "IND";
const PEER = "CHN";

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

function getTrend(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < 0.1) return { icon: Minus, color: "text-muted-foreground", label: "Stable" };
  return pct > 0
    ? { icon: ArrowUpRight, color: "text-green-600", label: `+${pct.toFixed(1)}%` }
    : { icon: ArrowDownRight, color: "text-red-600", label: `${pct.toFixed(1)}%` };
}

type Trend = { icon: LucideIcon; color: string; label: string } | null;

type ScoredIndicator = {
  id: string;
  name: string;
  category: string;
  unit: string | null;
  value: number | null;
  year: number | null;
  rank: number | null;
  total: number | null;
  score: number | null;
  trend: Trend;
  trendLabel: string | null;
};

export default async function ReportCardPage() {
  const allIndicators = await getAllIndicators();
  const [stats, snapshot, indiaHistory, ranks] = await Promise.all([
    getDashboardStats(),
    getLatestSnapshot(INDIA),
    getCountryHistory(INDIA),
    getLatestRanks(allIndicators.map((i) => i.id), [INDIA, PEER]),
  ]);

  const historyByIndicator = new Map<string, Array<{ year: number; value: number | null }>>();
  for (const p of indiaHistory) {
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
  const indiaRanks = rankByCountry.get(INDIA) ?? new Map();
  const peerRanks = rankByCountry.get(PEER) ?? new Map();

  // Score every indicator for India and the peer (China)
  const scored: ScoredIndicator[] = [];
  const categoryScores = new Map<string, { india: number[]; peer: number[] }>();
  for (const ind of allIndicators) {
    const snap = snapshot[ind.id];
    const indiaRank = indiaRanks.get(ind.id);
    const peerRank = peerRanks.get(ind.id);
    const score = indiaRank ? indicatorScore(indiaRank.rank, indiaRank.total) : null;

    if (!categoryScores.has(ind.category)) categoryScores.set(ind.category, { india: [], peer: [] });
    const bucket = categoryScores.get(ind.category)!;
    if (score != null) bucket.india.push(score);
    if (peerRank) bucket.peer.push(indicatorScore(peerRank.rank, peerRank.total));

    if (snap?.value != null && indiaRank) {
      const series = historyByIndicator.get(ind.id) ?? [];
      const prev = snap.year != null ? prevValueInSeries(series, snap.year) : null;
      const trend = getTrend(snap.value, prev);
      scored.push({
        id: ind.id,
        name: ind.name,
        category: ind.category,
        unit: ind.unit,
        value: snap.value,
        year: snap.year,
        rank: indiaRank.rank,
        total: indiaRank.total,
        score,
        trend,
        trendLabel: trend?.label ?? null,
      });
    }
  }

  // Per-category scores
  const categories = [...new Set(allIndicators.map((i) => i.category))];
  const catReport = categories
    .map((cat) => {
      const buckets = categoryScores.get(cat);
      const india = buckets && buckets.india.length > 0 ? average(buckets.india)! : null;
      const peer = buckets && buckets.peer.length > 0 ? average(buckets.peer)! : null;
      const indicatorsInCat = scored
        .filter((s) => s.category === cat)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 5);
      return { category: cat, score: india, peerScore: peer, entries: indicatorsInCat };
    })
    .filter((c) => c.score != null || c.entries.length > 0);

  const overallScore = average(catReport.map((c) => c.score).filter((s): s is number => s != null));
  const overallGrade: Grade = overallScore != null ? gradeFor(overallScore) : { letter: "—", color: "text-muted-foreground", label: "No data" };

  const rankedCats = catReport.filter((c) => c.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const best = rankedCats[0] ?? null;
  const worst = rankedCats[rankedCats.length - 1] ?? null;

  const radarData = catReport
    .filter((c) => c.score != null && c.peerScore != null)
    .map((c) => ({ category: c.category.replace(/_/g, " "), India: Math.round(c.score!), China: Math.round(c.peerScore!) }));

  const reportYear = Math.max(...catReport.flatMap((c) => c.entries.map((e) => e.year ?? 0).filter(Boolean))) || new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 border-b pb-8">
          <div className="flex items-center justify-center gap-2 text-amber-500">
            <FileText className="h-8 w-8" />
            <span className="text-sm font-medium">ANNUAL REPORT CARD</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">India {reportYear} Report Card</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A data-driven assessment of India&apos;s global standing across 10 categories.
            Based on {stats.totalDataPoints.toLocaleString()} data points from {stats.totalIndicators} indicators across {stats.totalCountries} countries.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {reportYear} Snapshot
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Globe className="h-3 w-3" />
              {stats.totalCountries} Countries Compared
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <BarChart2 className="h-3 w-3" />
              {scored.length} Indicators Scored
            </Badge>
          </div>

          {/* Overall grade */}
          <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-6 rounded-xl border bg-card p-5">
            <div className={`text-6xl font-black tracking-tight ${overallGrade.color}`}>
              {overallGrade.letter}
            </div>
            <div className="text-left">
              <div className="text-sm text-muted-foreground">Overall grade</div>
              <div className="text-xl font-semibold">{overallGrade.label}</div>
              <div className="text-sm text-muted-foreground">
                {overallScore != null ? `${overallScore.toFixed(1)} / 100 across ${catReport.length} categories` : "Not enough data"}
              </div>
            </div>
          </div>

          {best && worst && (
            <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm">
              <Badge variant="outline" className="gap-1 text-green-700">
                <TrendingUp className="h-3 w-3" />
                Strongest: {best.category.replace(/_/g, " ")} ({best.score!.toFixed(0)})
              </Badge>
              <Badge variant="outline" className="gap-1 text-red-700">
                <TrendingDown className="h-3 w-3" />
                Weakest: {worst.category.replace(/_/g, " ")} ({worst.score!.toFixed(0)})
              </Badge>
            </div>
          )}
        </div>

        {/* Radar */}
        {radarData.length > 0 && <ReportCardRadar data={radarData} />}

        {/* Category Sections */}
        {catReport.map(({ category, score, entries }) => {
          const Icon = ICONS[category] || Globe;
          const grade = score != null ? gradeFor(score) : null;
          return (
            <Card key={category} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-amber-500" />
                    {category.replace(/_/g, " ")}
                    {score != null && grade && (
                      <Badge variant="outline" className={`ml-1 ${grade.color}`}>
                        {grade.letter} · {score.toFixed(0)}
                      </Badge>
                    )}
                  </div>
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
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                {entries.map((entry) => {
                  const rankColor = entry.rank !== null
                    ? entry.rank <= Math.ceil((entry.total ?? 100) * 0.1) ? "text-green-600"
                    : entry.rank <= Math.ceil((entry.total ?? 100) * 0.25) ? "text-amber-600"
                    : entry.rank <= Math.ceil((entry.total ?? 100) * 0.5) ? "text-blue-600"
                    : "text-red-600"
                    : "text-muted-foreground";
                  const trend = entry.trend;

                  return (
                    <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border rounded-lg hover:border-amber-200 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-base">{entry.name}</span>
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
                        {trend && (
                          <div className="flex items-center gap-1">
                            <trend.icon className={`${trend.color} h-4 w-4`} />
                            <span className={`font-mono text-sm ${trend.color}`}>{trend.label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {/* Footer */}
        <div className="border-t pt-6 text-center text-sm text-muted-foreground space-y-2">
          <p>Data sources: World Bank, UNDP, WHO, Our World in Data, World Governance Indicators</p>
          <p>Generated on {new Date().toLocaleDateString()} &bull; India in the World Dashboard</p>
          <ExportButtons
            reportData={Object.fromEntries(
              catReport.map(({ category, entries }) => [
                category,
                entries.map((e) => ({
                  id: e.id,
                  name: e.name,
                  value: e.value,
                  year: e.year,
                  unit: e.unit,
                  rank: e.rank,
                  total: e.total,
                  trendLabel: e.trendLabel,
                })),
              ])
            )}
            reportYear={reportYear}
            totalCountries={stats.totalCountries}
            totalIndicators={stats.totalIndicators}
            totalDataPoints={stats.totalDataPoints}
          />
        </div>
      </div>
    </div>
  );
}
