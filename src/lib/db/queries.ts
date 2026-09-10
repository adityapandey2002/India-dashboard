import { query } from "./client";
import { rowToDataPoint, rowToIndicator, type DataPoint, type Indicator } from "./types";

export async function getAllIndicators(): Promise<Indicator[]> {
  const rows = await query<Record<string, unknown>>(`SELECT * FROM indicators ORDER BY category, name`);
  return rows.map(rowToIndicator);
}

export async function getIndicatorsByCategory(): Promise<Record<string, Indicator[]>> {
  const all = await getAllIndicators();
  const grouped: Record<string, Indicator[]> = {};
  for (const ind of all) {
    (grouped[ind.category] ??= []).push(ind);
  }
  return grouped;
}

export async function getIndicator(id: string): Promise<Indicator | null> {
  const rows = await query<Record<string, unknown>>(`SELECT * FROM indicators WHERE id = ?`, [id]);
  return rows[0] ? rowToIndicator(rows[0]) : null;
}

export async function getCountryHistory(iso3: string, fromYear?: number, toYear?: number): Promise<DataPoint[]> {
  const params: unknown[] = [iso3];
  let where = `country_iso3 = ?`;
  if (fromYear != null) { params.push(fromYear); where += ` AND year >= ?`; }
  if (toYear != null) { params.push(toYear); where += ` AND year <= ?`; }
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM data_points WHERE ${where} ORDER BY year`,
    params,
  );
  return rows.map(rowToDataPoint);
}

export async function getIndicatorSeries(iso3: string, indicatorId: string): Promise<DataPoint[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM data_points
     WHERE country_iso3 = ? AND indicator_id = ?
     ORDER BY year`,
    [iso3, indicatorId],
  );
  return rows.map(rowToDataPoint);
}

export async function getLatestSnapshot(iso3: string): Promise<Record<string, { value: number | null; year: number | null }>> {
  const rows = await query<{ indicator_id: string; value: number | null; year: number }>(
    `SELECT dp.indicator_id, dp.value, dp.year
     FROM data_points dp
     INNER JOIN (
       SELECT indicator_id, MAX(year) AS max_year
       FROM data_points
       WHERE country_iso3 = ?
       GROUP BY indicator_id
     ) latest
       ON dp.indicator_id = latest.indicator_id
      AND dp.year = latest.max_year
     WHERE dp.country_iso3 = ?`,
    [iso3, iso3],
  );
  const out: Record<string, { value: number | null; year: number | null }> = {};
  for (const r of rows) {
    out[r.indicator_id] = { value: r.value, year: r.year };
  }
  return out;
}

export async function getRankInYear(indicatorId: string, iso3: string, year: number, higherBetter = true): Promise<{ rank: number; total: number } | null> {
  const rows = await query<{ rank: number; total: number }>(
    `WITH ranked AS (
       SELECT country_iso3, RANK() OVER (ORDER BY value ${higherBetter ? "DESC" : "ASC"}) AS rank
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

/**
 * Batch: for each country+indicator, the rank of that country's OWN latest value
 * among all countries in the same indicator/year. One round-trip instead of one
 * per indicator. Ranks are compared highest-value-wins (rank 1 = best).
 */
export async function getLatestRanks(
  indicatorIds: string[],
  iso3s: string[],
): Promise<Array<{ indicatorId: string; countryIso3: string; year: number; rank: number; total: number }>> {
  if (indicatorIds.length === 0 || iso3s.length === 0) return [];
  const isoPlaceholders = iso3s.map(() => "?").join(", ");
  const indPlaceholders = indicatorIds.map(() => "?").join(", ");
  const rows = await query<{ indicator_id: string; country_iso3: string; year: number; rank: number | string; total: number | string }>(
    `WITH latest AS (
       SELECT dp.indicator_id, dp.country_iso3, dp.value, dp.year,
              ROW_NUMBER() OVER (PARTITION BY dp.indicator_id, dp.country_iso3 ORDER BY dp.year DESC) AS rn
       FROM data_points dp
       WHERE dp.value IS NOT NULL
     ),
     ranked AS (
       SELECT l.indicator_id, l.country_iso3, l.year,
              RANK() OVER (PARTITION BY l.indicator_id, l.year ORDER BY l.value DESC) AS rank,
              COUNT(*) OVER (PARTITION BY l.indicator_id, l.year) AS total
       FROM latest l
       WHERE l.rn = 1
     )
     SELECT indicator_id, country_iso3, year, rank, total
     FROM ranked
     WHERE country_iso3 IN (${isoPlaceholders})
       AND indicator_id IN (${indPlaceholders})`,
    [...iso3s, ...indicatorIds],
  );
  return rows.map((r) => ({
    indicatorId: r.indicator_id,
    countryIso3: r.country_iso3,
    year: r.year,
    rank: Number(r.rank),
    total: Number(r.total),
  }));
}

export async function getLeaderboard(indicatorId: string, year: number, limit = 30, higherBetter = true): Promise<Array<{ iso3: string; value: number | null }>> {
  const rows = await query<{ country_iso3: string; value: number | null }>(
    `SELECT country_iso3, value
     FROM data_points
     WHERE indicator_id = ? AND year = ? AND value IS NOT NULL
     ORDER BY value ${higherBetter ? "DESC" : "ASC"}
     LIMIT ?`,
    [indicatorId, year, limit],
  );
  return rows.map((r) => ({ iso3: r.country_iso3, value: r.value }));
}

export async function getAllCountries(): Promise<Array<{ iso3: string; name: string; region: string | null }>> {
  return query<{ iso3: string; name: string; region: string | null }>(
    `SELECT iso3, name, region FROM countries ORDER BY name`,
  );
}

export async function getIndicatorCoverage(): Promise<Array<{
  indicatorId: string;
  indicatorName: string;
  category: string;
  source: string;
  dataPoints: number;
  countriesWithData: number;
  firstYear: number | null;
  lastYear: number | null;
}>> {
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

export async function getLatestYear(indicatorId: string): Promise<number | null> {
  const rows = await query<{ yr: number }>(
    `SELECT MAX(year) AS yr FROM data_points WHERE indicator_id = ? AND value IS NOT NULL`,
    [indicatorId],
  );
  return rows[0]?.yr ?? null;
}

export async function getGlobalLatest(indicatorId: string): Promise<Array<{ iso3: string; value: number; year: number }>> {
  return await query<{ iso3: string; value: number; year: number }>(
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

/** For the rankings page: every country's most recent value for an indicator. */
export async function getRankingsForIndicator(indicatorId: string): Promise<Array<{ iso3: string; value: number; year: number }>> {
  return getGlobalLatest(indicatorId);
}

export async function getDashboardStats(): Promise<{
  totalCountries: number;
  totalIndicators: number;
  totalDataPoints: number;
  yearRange: { min: number; max: number };
}> {
  const totals = await query<{ totalCountries: number; totalIndicators: number; totalDataPoints: number; minYear: number | null; maxYear: number | null }>(
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
