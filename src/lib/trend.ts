/**
 * Year-over-year trend classification, single-sourced so the home KPIs,
 * country pages, report card and the CSV export can never disagree.
 *
 * A move smaller than FLAT_THRESHOLD_PCT counts as "flat" — macro indicators
 * (HDI, life expectancy, GDP) routinely move fractions of a percent per year,
 * so anything below 0.5% is noise, not direction.
 */
export const FLAT_THRESHOLD_PCT = 0.5;

export type TrendDirection = "up" | "down" | "flat";

export type TrendResult = { direction: TrendDirection; pct: number };

/**
 * Percent change between two values, classified up/down/flat.
 * Returns null when there is nothing to compare (missing values or a
 * zero previous value, where % change is undefined).
 */
export function computeTrend(
  current: number | null,
  previous: number | null,
): TrendResult | null {
  if (current == null || previous == null || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(pct) < FLAT_THRESHOLD_PCT) return { direction: "flat", pct };
  return { direction: pct > 0 ? "up" : "down", pct };
}
