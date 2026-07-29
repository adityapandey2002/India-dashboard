import { query } from "./client";
import { rowToDataPoint, rowToIndicator, type DataPoint, type Indicator } from "./types";

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

export function getCountryHistory(iso3: string, fromYear?: number, toYear?: number): DataPoint[] {
  const params: unknown[] = [iso3];
  let where = `country_iso3 = ?`;
  if (fromYear != null) { params.push(fromYear); where += ` AND year >= ?`; }
  if (toYear != null)   { params.push(toYear);   where += ` AND year <= ?`; }
  const rows = query<Record<string, unknown>>(
    `SELECT * FROM data_points WHERE ${where} ORDER BY year`,
    params,
  );
  return rows.map(rowToDataPoint);
}

export function getIndicatorSeries(iso3: string, indicatorId: string): DataPoint[] {
  const rows = query<Record<string, unknown>>(
    `SELECT * FROM data_points
     WHERE country_iso3 = ? AND indicator_id = ?
     ORDER BY year`,
    [iso3, indicatorId],
  );
  return rows.map(rowToDataPoint);
}

export function getLatestSnapshot(iso3: string): Record<string, { value: number | null; year: number | null }> {
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

export function getRankInYear(indicatorId: string, iso3: string, year: number): { rank: number; total: number } | null {
  const rows = query<{ rank: number; total: number }>(
    `WITH ranked AS (
       SELECT country_iso3, RANK() OVER (ORDER BY value DESC) AS rank
       FROM data_points
       WHERE indicator_id = ? AND year = ? AND value IS NOT NULL
     )
     SELECT rank, (SELECT COUNT(*) FROM data_points WHERE indicator_id = ? AND year = ? AND value IS NOT NULL) AS total
     FROM ranked WHERE country_iso3 = ?`,
    [indicatorId, year, indicatorId, year, iso3],
  );
  if (!rows[0]) return null;
  return { rank: rows[0].rank, total: rows[0].total };
}

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

export function getAllCountries(): Array<{ iso3: string; name: string; region: string | null }> {
  return query<{ iso3: string; name: string; region: string | null }>(
    `SELECT iso3, name, region FROM countries ORDER BY name`,
  );
}

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
  return query(
    `SELECT
       i.id AS "indicatorId",
       i.name AS "indicatorName",
       i.category,
       i.source,
       COALESCE(cov.dataPoints, 0) AS "dataPoints",
       COALESCE(cov.countriesWithData, 0) AS "countriesWithData",
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
     ORDER BY i.category, i.name`,
  );
}

export function getLatestYear(indicatorId: string): number | null {
  const rows = query<{ yr: number }>(
    `SELECT MAX(year) AS yr FROM data_points WHERE indicator_id = ? AND value IS NOT NULL`,
    [indicatorId],
  );
  return rows[0]?.yr ?? null;
}

export function getGlobalLatest(indicatorId: string): Array<{ iso3: string; value: number; year: number }> {
  return query<{ iso3: string; value: number; year: number }>(
    `SELECT dp.country_iso3 AS iso3, dp.value, dp.year
     FROM data_points dp
     INNER JOIN (
       SELECT country_iso3, MAX(year) AS max_year
       FROM data_points
       WHERE indicator_id = ? AND value IS NOT NULL
       GROUP BY country_iso3
     ) latest
       ON dp.country_iso3 = latest.country_iso3
      AND dp.year = latest.max_year
     WHERE dp.indicator_id = ? AND dp.value IS NOT NULL`,
    [indicatorId, indicatorId],
  );
}

export function getDashboardStats(): {
  totalCountries: number;
  totalIndicators: number;
  totalDataPoints: number;
  yearRange: { min: number; max: number };
} {
  const totals = query<{ totalCountries: number; totalIndicators: number; totalDataPoints: number; minYear: number | null; maxYear: number | null }>(
    `SELECT
       (SELECT COUNT(*) FROM countries) AS "totalCountries",
       (SELECT COUNT(*) FROM indicators) AS "totalIndicators",
       (SELECT COUNT(*) FROM data_points) AS "totalDataPoints",
       (SELECT MIN(year) FROM data_points) AS "minYear",
       (SELECT MAX(year) FROM data_points) AS "maxYear"`,
  );
  const t = totals[0];
  return {
    totalCountries: t?.totalCountries ?? 0,
    totalIndicators: t?.totalIndicators ?? 0,
    totalDataPoints: t?.totalDataPoints ?? 0,
    yearRange: { min: t?.minYear ?? 0, max: t?.maxYear ?? 0 },
  };
}
