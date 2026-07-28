/**
 * Reusable database queries for the dashboard.
 * These are the only place the rest of the app should talk to the DB.
 * If we move to Postgres later, we rewrite this file — nothing else changes.
 */

import { query } from "./client";
import { rowToDataPoint, rowToIndicator, type DataPoint, type Indicator } from "./types";

// ── Indicators ────────────────────────────────────────────────────

export function getAllIndicators(): Indicator[] {
  const rows = query<Record<string, unknown>>(`SELECT * FROM indicators ORDER BY category, name`);
  return rows.map(rowToIndicator);
}

export function getIndicatorsByCategory(): Record<string, Indicator[]> {
  const all = getAllIndicators();
  const grouped: Record<string, Indicator[]> = {};
  for (const ind of all) {
    (grouped[ind.category] ??= []).push(ind);
  }
  return grouped;
}

export function getIndicator(id: string): Indicator | null {
  const rows = query<Record<string, unknown>>(`SELECT * FROM indicators WHERE id = ?`, [id]);
  return rows[0] ? rowToIndicator(rows[0]) : null;
}

// ── Data points ───────────────────────────────────────────────────

/** All data points for a single country. Used by the country overview. */
export function getCountryHistory(iso3: string, fromYear?: number, toYear?: number): DataPoint[] {
  const params: unknown[] = [iso3];
  let where = `country_iso3 = ?`;
  if (fromYear != null) { where += ` AND year >= ?`; params.push(fromYear); }
  if (toYear   != null) { where += ` AND year <= ?`; params.push(toYear);   }
  const rows = query<Record<string, unknown>>(
    `SELECT * FROM data_points WHERE ${where} ORDER BY year`,
    params,
  );
  return rows.map(rowToDataPoint);
}

/** Time series for a single (country, indicator). */
export function getIndicatorSeries(iso3: string, indicatorId: string): DataPoint[] {
  const rows = query<Record<string, unknown>>(
    `SELECT * FROM data_points
     WHERE country_iso3 = ? AND indicator_id = ?
     ORDER BY year`,
    [iso3, indicatorId],
  );
  return rows.map(rowToDataPoint);
}

/** Latest available value for a country across all indicators. */
export function getLatestSnapshot(iso3: string): Record<string, { value: number | null; year: number | null }> {
  // SQLite trick: for each indicator_id, take the row with the max year.
  const rows = query<{ indicator_id: string; value: number | null; year: number }>(
    `SELECT dp.indicator_id, dp.value, dp.year
     FROM data_points dp
     INNER JOIN (
       SELECT indicator_id, MAX(year) AS max_year
       FROM data_points
       WHERE country_iso3 = ?
       GROUP BY indicator_id
     ) latest
       ON dp.indicator_id = latest.indicator_id
      AND dp.year        = latest.max_year
     WHERE dp.country_iso3 = ?`,
    [iso3, iso3],
  );
  const out: Record<string, { value: number | null; year: number | null }> = {};
  for (const r of rows) {
    out[r.indicator_id] = { value: r.value, year: r.year };
  }
  return out;
}

/** Global rank for an indicator in a given year. Returns 1-indexed rank (1 = best). */
export function getRankInYear(indicatorId: string, iso3: string, year: number): { rank: number; total: number } | null {
  const rows = query<{ rank: number; total: number }>(
    `SELECT
       CAST(RANK() OVER (ORDER BY value DESC) AS INTEGER) AS rank,
       COUNT(*) AS total
     FROM data_points
     WHERE indicator_id = ? AND year = ? AND value IS NOT NULL`,
    [indicatorId, year],
  );
  // Find India's rank
  const indiaRows = query<{ rank: number }>(
    `WITH ranked AS (
       SELECT country_iso3, RANK() OVER (ORDER BY value DESC) AS rank
       FROM data_points
       WHERE indicator_id = ? AND year = ? AND value IS NOT NULL
     )
     SELECT rank FROM ranked WHERE country_iso3 = ?`,
    [indicatorId, year, iso3],
  );
  if (!indiaRows[0] || !rows[0]) return null;
  return { rank: indiaRows[0].rank, total: rows[0].total };
}

/** Top N countries for an indicator in a given year. */
export function getLeaderboard(indicatorId: string, year: number, limit = 30): Array<{ iso3: string; value: number | null }> {
  const rows = query<{ country_iso3: string; value: number | null }>(
    `SELECT country_iso3, value
     FROM data_points
     WHERE indicator_id = ? AND year = ? AND value IS NOT NULL
     ORDER BY value DESC
     LIMIT ?`,
    [indicatorId, year, limit],
  );
  return rows.map((r) => ({ iso3: r.country_iso3, value: r.value }));
}

/** Country list (for dropdowns, maps, etc.) */
export function getAllCountries(): Array<{ iso3: string; name: string; region: string | null }> {
  return query<{ iso3: string; name: string; region: string | null }>(
    `SELECT iso3, name, region FROM countries ORDER BY name`,
  );
}

/** Coverage stats per indicator (data points, countries, year range). */
export function getIndicatorCoverage(): Array<{
  indicatorId: string;
  indicatorName: string;
  category: string;
  source: string;
  dataPoints: number;
  countriesWithData: number;
  firstYear: number | null;
  lastYear: number | null;
}> {
  return query(`
    SELECT
      i.id AS indicatorId,
      i.name AS indicatorName,
      i.category,
      i.source,
      COALESCE(cov.dataPoints, 0) AS dataPoints,
      COALESCE(cov.countriesWithData, 0) AS countriesWithData,
      cov.firstYear,
      cov.lastYear
    FROM indicators i
    LEFT JOIN (
      SELECT
        indicator_id,
        COUNT(*) AS dataPoints,
        COUNT(DISTINCT country_iso3) AS countriesWithData,
        MIN(year) AS firstYear,
        MAX(year) AS lastYear
      FROM data_points
      WHERE value IS NOT NULL
      GROUP BY indicator_id
    ) cov ON i.id = cov.indicator_id
    ORDER BY i.category, i.name
  `);
}

/** Summary stats for the home page hero. */
export function getDashboardStats(): {
  totalCountries: number;
  totalIndicators: number;
  totalDataPoints: number;
  yearRange: { min: number; max: number };
} {
  const totals = query<{ totalCountries: number; totalIndicators: number; totalDataPoints: number; minYear: number | null; maxYear: number | null }>(
    `SELECT
       (SELECT COUNT(*) FROM countries) AS totalCountries,
       (SELECT COUNT(*) FROM indicators) AS totalIndicators,
       (SELECT COUNT(*) FROM data_points) AS totalDataPoints,
       (SELECT MIN(year) FROM data_points) AS minYear,
       (SELECT MAX(year) FROM data_points) AS maxYear`,
  );
  const t = totals[0];
  return {
    totalCountries: t?.totalCountries ?? 0,
    totalIndicators: t?.totalIndicators ?? 0,
    totalDataPoints: t?.totalDataPoints ?? 0,
    yearRange: { min: t?.minYear ?? 0, max: t?.maxYear ?? 0 },
  };
}
