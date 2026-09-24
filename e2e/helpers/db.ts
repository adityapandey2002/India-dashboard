import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { isHigherBetter } from "../../src/lib/rank-direction";

/**
 * Read-only helpers to inspect the local SQLite DB (`data/india.db`).
 * Used to cross-check the indicator page's rendered "Recent trend" card
 * against the actual last-two-valued-points computation performed
 * server-side by `src/app/indicator/[id]/page.tsx`.
 */

let db: DatabaseSync | null = null;

function openDb(): DatabaseSync {
  if (!db) {
    const dbPath = path.join(process.cwd(), "data", "india.db");
    db = new DatabaseSync(dbPath);
  }
  return db;
}

export type TrendPoint = { year: number; value: number };

export function getSeries(indicatorId: string, iso3 = "IND"): TrendPoint[] {
  const rows = openDb()
    .prepare(
      `SELECT year, value FROM data_points
       WHERE indicator_id = ? AND country_iso3 = ? AND value IS NOT NULL
       ORDER BY year ASC`,
    )
    .all(indicatorId, iso3) as TrendPoint[];
  return rows;
}

export function getLatestPoints(
  indicatorId: string,
  iso3 = "IND",
): { last: TrendPoint | null; prev: TrendPoint | null } {
  const pts = getSeries(indicatorId, iso3);
  return {
    last: pts.length ? pts[pts.length - 1] : null,
    prev: pts.length > 1 ? pts[pts.length - 2] : null,
  };
}

export type ExpectedTrend = {
  hasData: boolean;
  higherBetter: boolean;
  last: TrendPoint | null;
  prev: TrendPoint | null;
  /** raw % change ((last - prev) / |prev|) * 100 */
  pct: number | null;
  /** whether the change is an improvement, using rank-direction */
  improving: boolean | null;
  /** raw icon direction the indicator page renders: "up" | "down" | null */
  icon: "up" | "down" | null;
  /** exact label text rendered by the indicator page */
  label: string | null;
  /** css class expected on the trend value/icon when improving vs not */
  colorClass: string | null;
};

/**
 * Mirror of the computation in `src/app/indicator/[id]/page.tsx`:
 *   trendPct = ((last - prev) / |prev|) * 100
 *   improving = higherBetter ? trendPct >= 0 : trendPct < 0
 *   trendLabel = `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% (vs ${prev.year})`
 *   icon: TrendingUp when trendPct >= 0 else TrendingDown
 *   color: emerald-600 when improving else red-500
 */
export function computeExpectedTrend(
  indicatorId: string,
  iso3 = "IND",
): ExpectedTrend {
  const { last, prev } = getLatestPoints(indicatorId, iso3);
  const higherBetter = isHigherBetter(indicatorId);

  if (!last || !prev || prev.value === 0) {
    return {
      hasData: false,
      higherBetter,
      last,
      prev,
      pct: null,
      improving: null,
      icon: null,
      label: null,
      colorClass: null,
    };
  }

  const pct = ((last.value - prev.value) / Math.abs(prev.value)) * 100;
  const improving = higherBetter ? pct >= 0 : pct < 0;
  const label = `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% (vs ${prev.year})`;

  return {
    hasData: true,
    higherBetter,
    last,
    prev,
    pct,
    improving,
    icon: pct >= 0 ? "up" : "down",
    label,
    colorClass: improving ? "text-emerald-600" : "text-red-500",
  };
}

export function getIndicatorName(indicatorId: string): string | null {
  const rows = openDb()
    .prepare(`SELECT name FROM indicators WHERE id = ?`)
    .all(indicatorId) as { name: string }[];
  return rows.length ? rows[0].name : null;
}

export function getCountryCount(): number {
  const rows = openDb().prepare(`SELECT COUNT(*) AS n FROM countries`).get() as {
    n: number;
  };
  return rows.n;
}