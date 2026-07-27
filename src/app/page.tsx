/**
 * India Overview — the home page.
 *
 * Server component: fetches data from the DB on the server, then hands
 * the pre-shaped data to client components (charts, leaderboards) for
 * rendering. This keeps first paint fast and SEO-friendly.
 */

import { Globe2, TrendingUp, Database, Calendar } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { Leaderboard, type LeaderRow } from "@/components/dashboard/leaderboard";
import { Badge } from "@/components/ui/badge";
import {
  getLatestSnapshot,
  getIndicatorSeries,
  getLeaderboard,
  getRankInYear,
  getAllCountries,
  getDashboardStats,
} from "@/lib/db/queries";

const INDIA = "IND";

// Countries we'll show on every comparison chart.
const COMPARISON_COUNTRIES: Array<{ iso3: string; name: string }> = [
  { iso3: "IND", name: "India" },
  { iso3: "USA", name: "USA" },
  { iso3: "CHN", name: "China" },
  { iso3: "BRA", name: "Brazil" },
  { iso3: "ZAF", name: "S. Africa" },
];

function fmtBig(v: number | null): string {
  if (v == null) return "—";
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3)  return v.toLocaleString();
  return v.toFixed(1);
}

function fmtPlain(v: number | null, decimals = 1): string {
  if (v == null) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export default async function HomePage() {
  // ── Pull everything we need in one render pass ──
  const stats = getDashboardStats();
  const snapshot = getLatestSnapshot(INDIA);
  const countries = getAllCountries();
  const countryByIso = new Map(countries.map((c) => [c.iso3, c.name]));

  // India key metrics (latest)
  const gdp      = snapshot["gdp_current_usd"];
  const lifeExp  = snapshot["life_expectancy"];
  const internet = snapshot["internet_penetration"];

  // Time series for the comparison chart
  const gdpSeries = COMPARISON_COUNTRIES.map((c) => ({
    name: c.name,
    data: getIndicatorSeries(c.iso3, "gdp_current_usd")
      .filter((p) => p.value != null)
      .map((p) => ({ year: p.year, value: p.value! })),
  }));

  const lifeExpSeries = COMPARISON_COUNTRIES.map((c) => ({
    name: c.name,
    data: getIndicatorSeries(c.iso3, "life_expectancy")
      .filter((p) => p.value != null)
      .map((p) => ({ year: p.year, value: p.value! })),
  }));

  // Leaderboard for most recent GDP year
  const latestGdpYear = gdp?.year ?? stats.yearRange.max;
  const topRows = getLeaderboard("gdp_current_usd", latestGdpYear, 12);
  const gdpLeaderboard: LeaderRow[] = topRows.map((r, i) => ({
    rank: i + 1,
    iso3: r.iso3,
    name: countryByIso.get(r.iso3) ?? r.iso3,
    value: r.value,
    isIndia: r.iso3 === INDIA,
  }));

  // India's global rank
  const indiaRank = gdp ? getRankInYear("gdp_current_usd", INDIA, latestGdpYear) : null;

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ────────────────────────────────────────────── */}
      <header className="border-b bg-gradient-to-b from-amber-50/40 to-background dark:from-amber-950/20">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium text-muted-foreground">India in the World</span>
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            How is India performing<br className="hidden md:block" /> compared to the rest of the world?
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A live dashboard of India&apos;s rankings across {stats.totalIndicators} global indicators,
            tracked over {stats.yearRange.max - stats.yearRange.min} years, sourced from {stats.totalCountries} countries.
            Updated from the World Bank&apos;s open data API.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* ── Top KPIs ──────────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="GDP (current US$)"
            value={fmtBig(gdp?.value)}
            hint={gdp?.year ? `${gdp.year} data` : ""}
            icon={<Database className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            label="Global GDP Rank"
            value={indiaRank ? `#${indiaRank.rank}` : "—"}
            hint={indiaRank ? `of ${indiaRank.total} countries` : ""}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            label="Life Expectancy"
            value={fmtPlain(lifeExp?.value, 1)}
            hint={lifeExp?.year ? `${lifeExp.year} · years` : ""}
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            label="Internet Penetration"
            value={internet?.value != null ? `${internet.value.toFixed(1)}%` : "—"}
            hint={internet?.year ? `${internet.year} data` : ""}
            icon={<Globe2 className="h-4 w-4 text-muted-foreground" />}
          />
        </section>

        {/* ── Trend chart: GDP comparison ────────────────────── */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold">GDP over time</h2>
              <p className="text-sm text-muted-foreground">India vs. major economies, current US$</p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Source: World Bank
            </Badge>
          </div>
          <TrendChart
            title="GDP (current US$)"
            unit="USD"
            series={gdpSeries}
          />
        </section>

        {/* ── Two-column: leaderboard + life expectancy ─────── */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Global GDP leaderboard</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Top 12 economies in {latestGdpYear}. India is highlighted.
            </p>
            <Leaderboard rows={gdpLeaderboard} />
          </div>

          <div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold">Life expectancy</h2>
                <p className="text-sm text-muted-foreground">Years, by country</p>
              </div>
            </div>
            <TrendChart
              title="Life expectancy at birth"
              unit="years"
              series={lifeExpSeries}
            />
          </div>
        </section>

        {/* ── Footer / data freshness ──────────────────────── */}
        <footer className="border-t pt-6 text-xs text-muted-foreground">
          <p>
            Built with Next.js · Data from World Bank Open Data (no API key) ·
            {stats.totalDataPoints.toLocaleString()} data points across {stats.totalIndicators} indicators ·
            Year range {stats.yearRange.min}–{stats.yearRange.max}
          </p>
        </footer>
      </div>
    </main>
  );
}
