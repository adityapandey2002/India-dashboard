export const dynamic = "force-dynamic";

import { Globe2, TrendingUp, Database, Calendar, BookOpen, Heart, BarChart3, Leaf } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { WorldMapCard } from "@/components/dashboard/world-map-card";
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

const INDIA = "IND";

const COMPARISON_COUNTRIES: Array<{ iso3: string; name: string }> = [
  { iso3: "IND", name: "India" },
  { iso3: "USA", name: "USA" },
  { iso3: "CHN", name: "China" },
  { iso3: "BRA", name: "Brazil" },
  { iso3: "ZAF", name: "S. Africa" },
];

function fmtBig(v: number | null): string {
  if (v == null) return "\u2014";
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3)  return v.toLocaleString();
  return v.toFixed(1);
}

function fmtPlain(v: number | null, decimals = 1): string {
  if (v == null) return "\u2014";
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
      `SELECT indicator_id AS indicatorId, COUNT(*) AS dataPoints FROM data_points GROUP BY indicator_id`
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
    const curr = snapshot[id]?.value;
    const prev = prevMap.get(id);
    if (curr == null || prev == null || prev === 0) return {};
    const pct = ((curr - prev) / Math.abs(prev)) * 100;
    if (Math.abs(pct) < 0.5) return { trend: "flat", trendLabel: "~0%" };
    const dir = pct > 0 ? "up" as const : "down" as const;
    return { trend: dir, trendLabel: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%` };
  }

  const indicatorsWithData = [...coverageMap.entries()].filter(([, c]) => c > 0).length;
  const pctCoverage = Math.round((indicatorsWithData / stats.totalIndicators) * 100);

  const kpiCards = [
    { label: "GDP (current US$)", value: fmtBig(gdp?.value), hint: gdp?.year ? `${gdp.year} · World Bank` : "", icon: Database, ...trend("gdp_current_usd") },
    { label: "Global GDP Rank", value: indiaRank ? `#${indiaRank.rank}` : "\u2014", hint: indiaRank ? `${indiaRank.total} countries` : "", icon: TrendingUp },
    { label: "Life Expectancy", value: fmtPlain(lifeExp?.value, 1), hint: lifeExp?.year ? `${lifeExp.year}y · WB+UNDP` : "", icon: Calendar, ...trend("life_expectancy") },
    { label: "Internet Access", value: internet?.value != null ? `${internet.value.toFixed(0)}%` : "\u2014", hint: internet?.year ? `${internet.year} · WB` : "", icon: Globe2, ...trend("internet_penetration") },
    { label: "HDI", value: hdi?.value != null ? hdi.value.toFixed(3) : "\u2014", hint: hdi?.year ? `${hdi.year} · UNDP` : "", icon: Globe2, ...trend("hdi") },
    { label: "GNI per capita", value: gniCap?.value != null ? `$${gniCap.value.toLocaleString(undefined, {maximumFractionDigits: 0})}` : "\u2014", hint: gniCap?.year ? `${gniCap.year} · UNDP` : "", icon: Database, ...trend("gni_per_capita") },
    { label: "School (expected)", value: fmtPlain(schoolYrs?.value, 1), hint: schoolYrs?.year ? `${schoolYrs.year}y · UNDP` : "", icon: BookOpen, ...trend("expected_yrs_school") },
    { label: "Maternal mortality", value: matMortal?.value != null ? `${matMortal.value.toFixed(0)}/100k` : "\u2014", hint: matMortal?.year ? `${matMortal.year} · WB` : "", icon: Heart, ...trend("maternal_mortality") },
    { label: "CO₂ per capita", value: co2?.value != null ? `${co2.value.toFixed(2)}t` : "\u2014", hint: co2?.year ? `${co2.year} · OWID` : "", icon: Leaf, ...trend("co2_per_capita") },
    { label: "UHC Coverage", value: uhc?.value != null ? `${uhc.value.toFixed(0)}%` : "\u2014", hint: uhc?.year ? `${uhc.year} · WHO` : "", icon: Heart, ...trend("uhc_idx") },
    { label: "Pop. growth", value: fmtPlain(popGrowth?.value, 2), hint: popGrowth?.year ? `${popGrowth.year} · WB` : "", icon: BarChart3, ...trend("population_growth") },
    { label: "Gini (inequality)", value: gini?.value != null ? gini.value.toFixed(1) : "\u2014", hint: gini?.year ? `${gini.year} · WB` : "", icon: BarChart3, ...trend("gini") },
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
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {kpiCards.map((kpi) => (
            <StatCard key={kpi.label} label={kpi.label} value={kpi.value} hint={kpi.hint} icon={<kpi.icon className="h-4 w-4 text-muted-foreground" />} trend={kpi.trend} trendLabel={kpi.trendLabel} />
          ))}
        </section>

        {/* World map */}
        <section>
          <WorldMapCard indicators={allIndicators} />
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
