/**
 * Pure helpers for the Report Card page (no DB access — easily unit tested).
 */

/**
 * Score an indicator for a country given its rank (1 = best) among `total`
 * countries. Returns a 0-100 score where the best country gets 100.
 *
 * This is a normalized SCORE, not a percentile: last place earns
 * 1/total × 100 (never 0), so category averages don't collapse.
 * Formula: score = 100 × (total − rank + 1) / total — documented on
 * /methodology. The /rankings page uses a true percentile instead
 * (see computeRankings() in rankings.ts); the two are intentionally
 * different statistics. Pinned by report-card.test.ts.
 */
export function indicatorScore(rank: number, total: number): number {
  if (!Number.isFinite(rank) || !Number.isFinite(total) || total <= 1) return 50;
  return ((total - rank + 1) / total) * 100;
}

/** Average of a list of scores, or null when empty. */
export function average(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export type Grade = { letter: string; color: string; label: string };

/** Map a 0-100 score to a letter grade. */
export function gradeFor(score: number): Grade {
  if (score >= 85) return { letter: "A", color: "text-green-600", label: "Excellent" };
  if (score >= 70) return { letter: "B", color: "text-emerald-600", label: "Good" };
  if (score >= 55) return { letter: "C", color: "text-amber-600", label: "Fair" };
  if (score >= 40) return { letter: "D", color: "text-orange-600", label: "Below average" };
  return { letter: "F", color: "text-red-600", label: "Weak" };
}

/** Previous available value in a series before `year` (handles gaps in years). */
export function prevValueInSeries(
  series: Array<{ year: number; value: number | null }>,
  year: number,
): number | null {
  let prev: number | null = null;
  let prevYear = -Infinity;
  for (const p of series) {
    if (p.value != null && p.year < year && p.year > prevYear) {
      prev = p.value;
      prevYear = p.year;
    }
  }
  return prev;
}
