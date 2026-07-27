/**
 * UNDP Human Development Report data fetcher.
 *
 * Why a CSV and not an API?
 *   The official UNDP data API was deprecated. The Human Development Report
 *   (HDR) team publishes a single comprehensive CSV with 30+ indicators for
 *   195 countries, 1990–2022. It's the cleanest, most authoritative source
 *   for HDI, IHDI, GII, GDI, GNI per capita, life expectancy, education
 *   years, mean schooling, CO2, material footprint, and population.
 *
 * How it works:
 *   1. Download the CSV once to data/raw/undp_hdr.csv (cached on disk).
 *   2. Parse the wide format (one column per year) into long format
 *      (one row per country-year-variable).
 *   3. Map each variable prefix to our internal indicator id.
 *   4. The ingest script writes everything to the data_points table.
 *
 * Data license: CC-BY-3.0 (UNDP HDR). Source: hdr.undp.org.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const UNDP_CSV_URL =
  "https://hdr.undp.org/sites/default/files/2023-24_HDR/HDR23-24_Composite_indices_complete_time_series.csv";
const CACHE_PATH = path.join(process.cwd(), "data", "raw", "undp_hdr.csv");

const FROM_YEAR = 2010;     // match our World Bank window
const TO_YEAR = 2022;       // most recent in the HDR 2023-24 release

/**
 * Map a UNDP variable prefix to our internal indicator id.
 *  prefix    our id                description
 *  hdi       hdi                   Human Development Index
 *  le        life_expectancy_undp  Life expectancy at birth (UNDP)
 *  eys       expected_yrs_school   Expected years of schooling
 *  mys       mean_yrs_school       Mean years of schooling
 *  gnipc     gni_per_capita        GNI per capita (PPP $)
 *  ihdi      ihdi                  Inequality-adjusted HDI
 *  gii       gender_ineq_idx       Gender Inequality Index
 *  gdi       gender_dev_idx        Gender Development Index
 *  mmr       maternal_mortality    Maternal mortality ratio
 *  co2_prod  co2_per_capita_undp   CO2 production per capita
 *  pop_total population_total     Total population
 */
const VARIABLE_MAP: Record<string, { id: string; category: string; source: string }> = {
  hdi:       { id: "hdi",                  category: "society",     source: "undp_hdr" },
  le:        { id: "life_expectancy_undp", category: "healthcare",  source: "undp_hdr" },
  eys:       { id: "expected_yrs_school",  category: "education",   source: "undp_hdr" },
  mys:       { id: "mean_yrs_school",      category: "education",   source: "undp_hdr" },
  gnipc:     { id: "gni_per_capita",       category: "economy",     source: "undp_hdr" },
  ihdi:      { id: "ihdi",                 category: "equality",    source: "undp_hdr" },
  gii:       { id: "gender_ineq_idx",      category: "equality",    source: "undp_hdr" },
  gdi:       { id: "gender_dev_idx",       category: "equality",    source: "undp_hdr" },
  mmr:       { id: "maternal_mortality_undp", category: "healthcare", source: "undp_hdr" },
  co2_prod:  { id: "co2_per_capita_undp",  category: "environment", source: "undp_hdr" },
  pop_total: { id: "population_total",     category: "society",     source: "undp_hdr" },
};

export type UndpDataPoint = {
  iso3: string;
  variable: string;        // "hdi", "le", ...
  year: number;
  value: number | null;
};

/** Synchronous download (script context). */
export function downloadUndpCsv(): void {
  if (existsSync(CACHE_PATH)) {
    console.log(`  ⏩ UNDP CSV already cached at ${CACHE_PATH}`);
    return;
  }
  mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  // Use Node's built-in fetch (Node 18+). We do this in an async IIFE
  // because the caller is async anyway.
  throw new Error("Use downloadUndpCsvAsync");
}

export async function downloadUndpCsvAsync(): Promise<string> {
  if (existsSync(CACHE_PATH)) {
    console.log(`  ⏩ UNDP CSV cached: ${CACHE_PATH}`);
    return CACHE_PATH;
  }
  mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  console.log(`  ⬇  Downloading UNDP HDR CSV (1.9 MB) …`);
  const res = await fetch(UNDP_CSV_URL, {
    headers: { "User-Agent": "IndiaDashboard/0.1" },
  });
  if (!res.ok) throw new Error(`UNDP CSV download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(CACHE_PATH, buf);
  console.log(`  ✓ Saved to ${CACHE_PATH} (${(buf.length / 1024).toFixed(0)} KB)`);
  return CACHE_PATH;
}

/** Tiny CSV parser — the file is simple (no quoted commas in the worst cells). */
function splitCsvLine(line: string): string[] {
  return line.split(",");
}

/**
 * Parse the HDR CSV and return one UndpDataPoint per (country, variable, year)
 * where the value is non-null. The CSV is "wide": columns like
 * hdi_2010, hdi_2011, … — we turn it into long format.
 */
export function parseUndpCsv(csvPath: string): UndpDataPoint[] {
  const text = readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = splitCsvLine(lines[0]);
  // Map column index → { variable, year } so we only keep the years we want
  const colMeta = new Map<number, { variable: string; year: number }>();
  for (let i = 4; i < header.length; i++) {  // skip iso3, country, hdicode, region
    const h = header[i].trim();
    const m = h.match(/^([a-z_]+)_(\d{4})$/);
    if (!m) continue;
    const year = parseInt(m[2], 10);
    if (year < FROM_YEAR || year > TO_YEAR) continue;
    if (!VARIABLE_MAP[m[1]]) continue;
    colMeta.set(i, { variable: m[1], year });
  }

  const out: UndpDataPoint[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = splitCsvLine(lines[li]);
    const iso3 = cols[0];
    if (!iso3 || iso3.length !== 3) continue;
    for (const [idx, meta] of colMeta) {
      const raw = cols[idx]?.trim();
      if (!raw || raw === "" || raw === ".." || raw === "NA") continue;
      const v = parseFloat(raw);
      if (Number.isNaN(v)) continue;
      out.push({ iso3, variable: meta.variable, year: meta.year, value: v });
    }
  }
  return out;
}

/** Convenience: list the variable → indicator id map (used by the registry). */
export function getUndpVariableMap(): typeof VARIABLE_MAP {
  return VARIABLE_MAP;
}
