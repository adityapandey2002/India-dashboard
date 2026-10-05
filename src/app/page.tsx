export const dynamic = "force-dynamic";

import { Globe2, TrendingUp, Database, Calendar, BookOpen, Heart, BarChart3, Leaf } from "lucide-react";
import { KpiGrid, type KpiCard } from "@/components/dashboard/kpi-grid";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { WorldMapCard } from "@/components/dashboard/world-map-card";
import { ScatterCard } from "@/components/dashboard/scatter-chart";
import { Leaderboard, type LeaderRow } from "@/components/dashboard/leaderboard";
import { Badge } from "@/components/ui/badge";
import {
  getLatestSnapshot,
  getIndicatorSeries,
  getLeaderboard,
  getRankInYear,
  getAllCountries,
  getDashboardStats,
  getAllIndicators,
} from "@/lib/db/queries";
import { query } from "@/lib/db/client";
import { computeTrend } from "@/lib/trend";
import { fmtMoney } from "@/lib/format";

const INDIA = "IND";

const COMPARISON_COUNTRIES: Array<{ iso3: string; name: string }> = [
  { iso3: "IND", name: "India" },
  { iso3: "USA", name: "USA" },
  { iso3: "CHN", name: "China" },
  { iso3: "BRA", name: "Brazil" },
  { iso3: "ZAF", name: "S. Africa" },
];

function fmtPlain(v: number | null, decimals = 1): string {
  if (v == null) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export default async function HomePage() {
  const [stats, snapshot, countries, allIndicators, sources, indicatorCoverage] = await Promise.all([
    getDashboardStats(),
    getLatestSnapshot(INDIA),
    getAllCountries(),
    getAllIndicators(),
    query<{ id: string; name: string }>(`SELECT id, name FROM sources ORDER BY name`),
    query<{ indicatorId: string; dataPoints: number }>(
      `SELECT indicator_id AS "indicatorId", COUNT(*) AS "dataPoints" FROM data_points GROUP BY indicator_id`
    ),
  ]);
  const countryByIso = new Map(countries.map((c) => [c.iso3, c.name]));
  const coverageMap = new Map(indicatorCoverage.map((r) => [r.indicatorId, Number(r.dataPoints)]));
  const hasData = (id: string) => (coverageMap.get(id) ?? 0) > 0;

  const gdp      = snapshot["gdp_current_usd"];
  const lifeExp  = snapshot["life_expectancy"];
  const internet = snapshot["internet_penetration"];
  const hdi      = snapshot["hdi"];
  const gniCap   = snapshot["gni_per_capita"];
  const schoolYrs = snapshot["expected_yrs_school"];
  const matMortal = snapshot["maternal_mortality"];
  const co2      = snapshot["co2_per_capita"];
  const uhc      = snapshot["uhc_idx"];
  const gini     = snapshot["gini"];
  const popGrowth = snapshot["population_growth"];

  const [gdpSeries, lifeExpSeries, hdiSeries, co2Series] = await Promise.all(
    ["gdp_current_usd", "life_expectancy", "hdi", "co2_per_capita"].map((indicatorId) =>
      Promise.all(
        COMPARISON_COUNTRIES.map(async (c) => ({
          name: c.name,
          data: (await getIndicatorSeries(c.iso3, indicatorId))
            .filter((p) => p.value != null)
            .map((p) => ({ year: p.year, value: p.value! })),
        })),
      ),
    ),
  );

  const latestGdpYear = gdp?.year ?? stats.yearRange.max;
  const [topRows, indiaRank] = await Promise.all([
    getLeaderboard("gdp_current_usd", latestGdpYear, 12),
    gdp ? getRankInYear("gdp_current_usd", INDIA, latestGdpYear) : Promise.resolve(null),
  ]);
  const gdpLeaderboard: LeaderRow[] = topRows.map((r, i) => ({
    rank: i + 1,
    iso3: r.iso3,
    name: countryByIso.get(r.iso3) ?? r.iso3,
    value: r.value,
    isIndia: r.iso3 === INDIA,
  }));

  // Fetch previous year values for trend arrows
  const kpiIds = ["gdp_current_usd", "life_expectancy", "internet_penetration", "hdi", "gni_per_capita",
    "expected_yrs_school", "maternal_mortality", "co2_per_capita", "uhc_idx", "gini", "population_growth"];
  const prevValues = await Promise.all(
    kpiIds.map(async (id) => {
      const yr = snapshot[id]?.year;
      if (!yr) return null;
      const rows = await query<{ value: number }>(
        `SELECT value FROM data_points WHERE indicator_id = ? AND country_iso3 = ? AND year = ?`,
        [id, INDIA, yr - 1],
      );
      return rows[0]?.value ?? null;
    }),
  );
  const prevMap = new Map(kpiIds.map((id, i) => [id, prevValues[i]]));

  function trend(id: string): { trend?: "up" | "down" | "flat"; trendLabel?: string } {
    const t = computeTrend(snapshot[id]?.value ?? null, prevMap.get(id) ?? null);
    if (!t) return {};
    if (t.direction === "flat") return { trend: "flat", trendLabel: "~0%" };
    return { trend: t.direction, trendLabel: `${t.pct > 0 ? "+" : ""}${t.pct.toFixed(1)}%` };
  }

  const indicatorsWithData = [...coverageMap.entries()].filter(([, c]) => c > 0).length;
  const pctCoverage = Math.round((indicatorsWithData / stats.totalIndicators) * 100);

  const indicatorMeta = new Map(allIndicators.map((i) => [i.id, i]));

  const kpiCards: KpiCard[] = [
    { label: "GDP (current US$)", value: fmtMoney(gdp?.value), hint: gdp?.year ? `${gdp.year} · World Bank` : "", icon: "Database", indicatorId: "gdp_current_usd", category: "economy", unit: "US$", description: indicatorMeta.get("gdp_current_usd")?.description ?? undefined, ...trend("gdp_current_usd") },
    { label: "Global GDP Rank", value: indiaRank ? `#${indiaRank.rank}` : "—", hint: indiaRank ? `${indiaRank.total} countries` : "", icon: "TrendingUp", indicatorId: "gdp_current_usd", category: "economy", unit: "US$", description: "India's position in the world GDP ranking for the latest year." },
    { label: "Life Expectancy", value: fmtPlain(lifeExp?.value, 1), hint: lifeExp?.year ? `${lifeExp.year}y · WB+UNDP` : "", icon: "Calendar", indicatorId: "life_expectancy", category: "health", unit: "years", description: indicatorMeta.get("life_expectancy")?.description ?? undefined, ...trend("life_expectancy") },
    { label: "Internet Access", value: internet?.value != null ? `${internet.value.toFixed(0)}%` : "—", hint: internet?.year ? `${internet.year} · WB` : "", icon: "Globe2", indicatorId: "internet_penetration", category: "technology", unit: "% of population", description: indicatorMeta.get("internet_penetration")?.description ?? undefined, ...trend("internet_penetration") },
    { label: "HDI", value: hdi?.value != null ? hdi.value.toFixed(3) : "—", hint: hdi?.year ? `${hdi.year} · UNDP` : "", icon: "Globe2", indicatorId: "hdi", category: "development", unit: "index (0–1)", description: indicatorMeta.get("hdi")?.description ?? undefined, ...trend("hdi") },
    { label: "GNI per capita", value: gniCap?.value != null ? `$${gniCap.value.toLocaleString(undefined, {maximumFractionDigits: 0})}` : "—", hint: gniCap?.year ? `${gniCap.year} · UNDP` : "", icon: "Database", indicatorId: "gni_per_capita", category: "economy", unit: "US$", description: indicatorMeta.get("gni_per_capita")?.description ?? undefined, ...trend("gni_per_capita") },
    { label: "School (expected)", value: fmtPlain(schoolYrs?.value, 1), hint: schoolYrs?.year ? `${schoolYrs.year}y · UNDP` : "", icon: "BookOpen", indicatorId: "expected_yrs_school", category: "education", unit: "years", description: indicatorMeta.get("expected_yrs_school")?.description ?? undefined, ...trend("expected_yrs_school") },
    { label: "Maternal mortality", value: matMortal?.value != null ? `${matMortal.value.toFixed(0)}/100k` : "—", hint: matMortal?.year ? `${matMortal.year} · WB` : "", icon: "Heart", indicatorId: "maternal_mortality", category: "health", unit: "per 100k births", description: indicatorMeta.get("maternal_mortality")?.description ?? undefined, ...trend("maternal_mortality") },
    { label: "CO₂ per capita", value: co2?.value != null ? `${co2.value.toFixed(2)}t` : "—", hint: co2?.year ? `${co2.year} · OWID` : "", icon: "Leaf", indicatorId: "co2_per_capita", category: "environment", unit: "tonnes", description: indicatorMeta.get("co2_per_capita")?.description ?? undefined, ...trend("co2_per_capita") },
    { label: "UHC Coverage", value: uhc?.value != null ? `${uhc.value.toFixed(0)}%` : "—", hint: uhc?.year ? `${uhc.year} · WHO` : "", icon: "Heart", indicatorId: "uhc_idx", category: "health", unit: "index (0–100)", description: indicatorMeta.get("uhc_idx")?.description ?? undefined, ...trend("uhc_idx") },
    { label: "Pop. growth", value: fmtPlain(popGrowth?.value, 2), hint: popGrowth?.year ? `${popGrowth.year} · WB` : "", icon: "BarChart3", indicatorId: "population_growth", category: "demographics", unit: "% per year", description: indicatorMeta.get("population_growth")?.description ?? undefined, ...trend("population_growth") },
    { label: "Gini (inequality)", value: gini?.value != null ? gini.value.toFixed(1) : "—", hint: gini?.year ? `${gini.year} · WB` : "", icon: "BarChart3", indicatorId: "gini", category: "society", unit: "index (0–100)", description: indicatorMeta.get("gini")?.description ?? undefined, ...trend("gini") },
  ];

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-b from-amber-50/40 to-background dark:from-amber-950/20">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium text-muted-foreground">India in the World</span>
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            How is India performing compared to the rest of the world?
          </h1>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{stats.totalDataPoints.toLocaleString()} data points</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{indicatorsWithData}/{stats.totalIndicators} indicators with data ({pctCoverage}%)</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{stats.totalCountries} countries</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{stats.yearRange.min}–{stats.yearRange.max}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* KPI grid */}
        <KpiGrid cards={kpiCards} />

        {/* World map */}
        <section>
          <WorldMapCard
            indicators={allIndicators}
            regions={Object.fromEntries(countries.map((c) => [c.iso3, c.region]))}
          />
        </section>

        {/* Scatter correlation */}
        <section>
          <ScatterCard
            indicators={allIndicators.filter((i) => hasData(i.id)).map((i) => ({ id: i.id, name: i.name, category: i.category }))}
            initialX="gni_per_capita"
            initialY="innovation_idx"
          />
        </section>

        {/* GDP trend */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">GDP over time</h2>
              <p className="text-sm text-muted-foreground">India vs. major economies, current US$</p>
            </div>
            <Badge variant="secondary" className="text-xs">World Bank</Badge>
          </div>
          <TrendChart title="GDP (current US$)" unit="USD" series={gdpSeries} />
        </section>

        {/* Two-column: leaderboard + life expectancy */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Global GDP leaderboard</h2>
            <p className="mb-3 text-sm text-muted-foreground">Top 12 economies in {latestGdpYear}.</p>
            <Leaderboard rows={gdpLeaderboard} />
          </div>
          <div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold">Life expectancy</h2>
                <p className="text-sm text-muted-foreground">Years, by country</p>
              </div>
              <Badge variant="secondary" className="text-xs">WB + UNDP</Badge>
            </div>
            <TrendChart title="Life expectancy at birth" unit="years" series={lifeExpSeries} />
          </div>
        </section>

        {/* HDI + CO2 */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold">Human Development Index</h2>
                <p className="text-sm text-muted-foreground">Composite of life expectancy, education, income</p>
              </div>
              <Badge variant="secondary" className="text-xs">UNDP</Badge>
            </div>
            <TrendChart title="HDI (0–1)" unit="index" series={hdiSeries} />
          </div>
          <div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold">CO₂ emissions per capita</h2>
                <p className="text-sm text-muted-foreground">Metric tons per person</p>
              </div>
              <Badge variant="secondary" className="text-xs">OWID</Badge>
            </div>
            <TrendChart title="CO₂ per capita" unit="tonnes" series={co2Series} />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t pt-6 text-xs text-muted-foreground">
          <p>
            Built with Next.js · Data from {sources.map((s) => s.name).join(", ")} ·{" "}
            {stats.totalDataPoints.toLocaleString()} pts across {indicatorsWithData}/{stats.totalIndicators} indicators ·{" "}
            {stats.yearRange.min}–{stats.yearRange.max}
          </p>
        </footer>
      </div>
    </main>
  );
}
