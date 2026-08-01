/**
 * Pure helpers for the Global Rankings page (no DB access — easily unit tested).
 */

export type RankRow = {
  iso3: string;
  value: number;
  year: number;
  rank: number;
  total: number;
  percentile: number;
};

export type HistoryPoint = { year: number; rank: number; total: number };

/** Standard competition ranking: equal values share the best rank (1,2,2,4). */
function competitionRank(values: number[], value: number, higherIsBetter: boolean): number {
  if (higherIsBetter) return values.filter((v) => v > value).length + 1;
  return values.filter((v) => v < value).length + 1;
}

/**
 * Sort countries by their latest value and assign ranks + percentiles.
 * Rank 1 = best (highest value when higherIsBetter, lowest when not).
 */
export function computeRankings(
  rows: Array<{ iso3: string; value: number; year: number }>,
  higherIsBetter: boolean,
): RankRow[] {
  const values = rows.map((r) => r.value);
  const sorted = [...rows].sort((a, b) =>
    higherIsBetter ? b.value - a.value : a.value - b.value,
  );
  const total = sorted.length;
  return sorted.map((r) => {
    const rank = competitionRank(values, r.value, higherIsBetter);
    const percentile = total > 1 ? ((total - rank) / (total - 1)) * 100 : 100;
    return {
      iso3: r.iso3,
      value: r.value,
      year: r.year,
      rank,
      total,
      percentile: Math.round(percentile * 10) / 10,
    };
  });
}

/** Rank a single country (India) within each year of its series. */
export function computeRankHistory(
  series: Array<{ year: number; value: number }>,
  higherIsBetter: boolean,
): HistoryPoint[] {
  const byYear = new Map<number, number[]>();
  for (const p of series) {
    if (!byYear.has(p.year)) byYear.set(p.year, []);
    byYear.get(p.year)!.push(p.value);
  }

  const out: HistoryPoint[] = [];
  for (const p of series) {
    const values = byYear.get(p.year)!;
    out.push({
      year: p.year,
      rank: competitionRank(values, p.value, higherIsBetter),
      total: values.length,
    });
  }
  return out.sort((a, b) => a.year - b.year);
}

/** How many rank spots India moved between the two most recent years with data. */
export function rankDelta(history: HistoryPoint[]): number | null {
  if (history.length < 2) return null;
  const a = history[history.length - 2];
  const b = history[history.length - 1];
  return b.rank - a.rank;
}
