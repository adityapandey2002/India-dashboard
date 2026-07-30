export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { ArrowUpRight, ArrowDownRight, Minus, FileText, Calendar, Globe, BarChart2, Heart, Shield, Leaf, Zap, Users, Building2, BookOpen, Stethoscope } from "lucide-react";
import { getDashboardStats, getLatestSnapshot, getRankInYear, getAllIndicators, getAllCountries } from "@/lib/db/queries";
import { query } from "@/lib/db/client";

const INDIA = "IND";

const ICONS: Record<string, any> = {
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

export default async function ReportCardPage() {
  const [stats, snapshot, countries, allIndicators] = await Promise.all([
    getDashboardStats(),
    getLatestSnapshot(INDIA),
    getAllCountries(),
    getAllIndicators(),
  ]);
  const countryMap = new Map(countries.map((c) => [c.iso3, c.name]));

  // Get top 5 indicators per category with data
  const categories = [...new Set(allIndicators.map((i) => i.category))];
  const reportData: Record<string, Array<{
    id: string; name: string; value: number | null; year: number | null; 
    unit: string | null; rank: number | null; total: number | null; trend: any; trendLabel: string | null;
  }>> = {};

  for (const cat of categories) {
    const catIndicators = allIndicators.filter((i) => i.category === cat && (snapshot[i.id]?.value != null));
    const entries = await Promise.all(catIndicators.slice(0, 5).map(async (ind) => {
      const val = snapshot[ind.id]?.value;
      const yr = snapshot[ind.id]?.year;
      const rank = val != null && yr != null ? await getRankInYear(ind.id, INDIA, yr) : null;
      const prevYr = yr ? yr - 1 : null;
      const prevRows = prevYr ? await query<{ value: number }>(
        `SELECT value FROM data_points WHERE indicator_id = ? AND country_iso3 = ? AND year = ?`,
        [ind.id, INDIA, prevYr]
      ) : [];
      const prevVal = prevRows[0]?.value ?? null;
      const trend = getTrend(val, prevVal);
      return {
        id: ind.id,
        name: ind.name,
        value: val,
        year: yr,
        unit: ind.unit,
        rank: rank?.rank ?? null,
        total: rank?.total ?? null,
        trend,
        trendLabel: trend?.label ?? null,
      };
    }));
    reportData[cat] = entries.filter((e) => e.value != null);
  }

  const reportYear = Math.max(...Object.values(reportData).flatMap((e) => e.map((x) => x.year ?? 0).filter(Boolean))) || new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 border-b pb-8">
          <div className="flex items-center justify-center gap-2 text-amber-500">
            <FileText className="h-8 w-8" />
            <span className="text-sm font-medium">ANNUAL REPORT CARD</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">India {reportYear} Report Card</h1>
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
              {Object.values(reportData).flat().length} Indicators Scored
            </Badge>
          </div>
        </div>

        {/* Category Sections */}
        {categories.map((cat) => {
          const entries = reportData[cat] ?? [];
          if (entries.length === 0) return null;
          const Icon = ICONS[cat] || Globe;
          
          return (
            <Card key={cat} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-amber-500" />
                  {cat.replace(/_/g, " ")}
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
                        {entry.trend && (
                          <div className="flex items-center gap-1">
                            <entry.trend.icon className={`${entry.trend.color} h-4 w-4`} />
                            <span className={`font-mono text-sm ${entry.trend.color}`}>{entry.trend.label}</span>
                          </div>
                        )}
                        {entry.rank === null && entry.trend === null && (
                          <span className="text-xs text-muted-foreground">Insufficient data</span>
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
              Object.entries(reportData).map(([cat, entries]) => [
                cat,
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
