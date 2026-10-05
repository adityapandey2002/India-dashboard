export function fmtValue(v: number | null, unit?: string | null): string {
  if (v == null) return "—";
  let s: string;
  if (Math.abs(v) >= 1e12) s = `${(v / 1e12).toFixed(2)}T`;
  else if (Math.abs(v) >= 1e9) s = `${(v / 1e9).toFixed(2)}B`;
  else if (Math.abs(v) >= 1e6) s = `${(v / 1e6).toFixed(2)}M`;
  else if (Math.abs(v) >= 1e3) s = `${(v / 1e3).toFixed(1)}k`;
  else s = v.toLocaleString("en-US", { maximumFractionDigits: unit === "%" ? 1 : 2 });
  return unit ? `${s} ${unit}` : s;
}

/** Rounds to at most 2 decimals and drops trailing zeros (32 → "32", 1.5 → "1.5"). */
function trim(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compact form for chart axes and tick labels: 32,000,000,000,000 → "32T".
 * Unlike {@link fmtValue} it never pads with forced decimals, so axis labels stay short.
 */
export function fmtCompact(v: number | null): string {
  if (v == null) return "—";
  const a = Math.abs(v);
  if (a >= 1e12) return `${trim(v / 1e12)}T`;
  if (a >= 1e9) return `${trim(v / 1e9)}B`;
  if (a >= 1e6) return `${trim(v / 1e6)}M`;
  if (a >= 1e3) return `${trim(v / 1e3)}k`;
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Headline money KPI (hero numbers, e.g. the home GDP card):
 * 3.85e12 → "$3.85T". Unlike {@link fmtValue} this prefixes "$" and uses
 * 1 decimal at B/M; unlike {@link fmtCompact} it keeps forced decimals at
 * trillions. The sign precedes the symbol (-$1.50T). Small values keep the
 * raw number (no "$") — only GDP-scale values use this today.
 */
export function fmtMoney(v: number | null): string {
  if (v == null) return "—";
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return v.toLocaleString();
  return v.toFixed(1);
}