/**
 * Data ingestion script.
 *
 * Run with:  npm run ingest
 *
 * What it does:
 *   1. Seeds the sources + indicators + countries tables (idempotent)
 *   2. For each World Bank indicator, fetches all available history
 *      for the countries we care about.
 *   3. Upserts into the local SQLite DB.
 *
 * Performance:
 *   - 5 concurrent fetches (well under WB's rate limit)
 *   - Skip indicators that have been refreshed in the last 24h
 *   - One DB transaction per indicator for speed
 */

import "dotenv/config";
import path from "node:path";
import { execute, query, getDb } from "../src/lib/db/client";
import { INDICATORS } from "../src/lib/data/indicators";
import { fetchAllCountries, fetchIndicator } from "../src/lib/data/sources/world-bank";
import { downloadUndpCsvAsync, parseUndpCsv, getUndpVariableMap } from "../src/lib/data/sources/undp";
import { fetchWhoIndicatorData } from "../src/lib/data/sources/who";
import { fetchItuData } from "../src/lib/data/sources/itu";
import { fetchWipoData } from "../src/lib/data/sources/wipo";
import { fetchOwidCo2Data } from "../src/lib/data/sources/owid";

const FOCUS_COUNTRIES = [
  "IND", "USA", "CHN", "JPN", "DEU", "GBR", "FRA", "BRA", "RUS", "CAN",
  "AUS", "KOR", "ITA", "MEX", "IDN", "TUR", "SAU", "CHE", "NLD", "ZAF",
  "ARG", "SWE", "NOR", "ESP", "SGP", "BGD", "PAK", "LKA", "NPL", "BTN",
];

const SOURCES = [
  { id: "world_bank", name: "World Bank Open Data", url: "https://data.worldbank.org/", type: "api" },
  { id: "undp",       name: "UNDP Human Development Reports", url: "https://hdr.undp.org/", type: "api" },
  { id: "who",        name: "World Health Organization GHO", url: "https://www.who.int/data/gho", type: "api" },
  { id: "wef",        name: "World Economic Forum", url: "https://www.weforum.org/", type: "pdf" },
  { id: "ti",         name: "Transparency International CPI", url: "https://www.transparency.org/", type: "pdf" },
  { id: "wjp",        name: "World Justice Project", url: "https://worldjusticeproject.org/", type: "pdf" },
  { id: "itu",        name: "ITU Data", url: "https://www.itu.int/en/ITU-D/Statistics/", type: "api" },
  { id: "wipo",       name: "WIPO IP Statistics", url: "https://www.wipo.int/ipstats/", type: "api" },
  { id: "yale",       name: "Yale Environmental Performance Index", url: "https://epi.yale.edu/", type: "pdf" },
  { id: "germanwatch",name: "Germanwatch CCPI", url: "https://www.germanwatch.org/", type: "pdf" },
  { id: "imd",        name: "IMD World Competitiveness", url: "https://www.imd.org/", type: "pdf" },
  { id: "oxford",     name: "Oxford Insights AI Readiness", url: "https://www.oxfordinsights.com/", type: "pdf" },
];

const CONCURRENCY = 5;          // parallel fetches
const STALE_HOURS = 24;         // re-fetch if older than this
const FROM_YEAR = 2010;         // 14-year window is enough for trends

async function seedStatic() {
  console.log("📚 Seeding source registry...");
  for (const s of SOURCES) {
    execute(
      `INSERT INTO sources (id, name, url, type) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, url=excluded.url, type=excluded.type`,
      [s.id, s.name, s.url, s.type],
    );
  }

  console.log("📊 Seeding indicator registry...");
  for (const ind of INDICATORS) {
    execute(
      `INSERT INTO indicators (id, name, category, source, source_id, unit, description, update_freq)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, category=excluded.category, source=excluded.source,
         source_id=excluded.source_id, unit=excluded.unit, description=excluded.description,
         update_freq=excluded.update_freq`,
      [ind.id, ind.name, ind.category, ind.source, ind.sourceId, ind.unit, ind.description, ind.freq ?? null],
    );
  }

  console.log("🌍 Fetching World Bank country list...");
  const countries = await fetchAllCountries();
  console.log(`   Found ${countries.length} countries. Seeding...`);
  for (const c of countries) {
    execute(
      `INSERT INTO countries (iso3, iso2, name, region, income_group, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(iso3) DO UPDATE SET
         name=excluded.name, region=excluded.region, income_group=excluded.income_group,
         latitude=excluded.latitude, longitude=excluded.longitude`,
      [
        c.id, c.iso2Code, c.name,
        c.region?.value ?? null,
        c.incomeLevel?.value ?? null,
        c.latitude ? parseFloat(c.latitude) : null,
        c.longitude ? parseFloat(c.longitude) : null,
      ],
    );
  }
}

/** Has this indicator been refreshed in the last STALE_HOURS? */
function isFresh(indicatorId: string): boolean {
  const row = query<{ max: string | null }>(
    `SELECT MAX(fetched_at) AS max FROM data_points WHERE indicator_id = ?`,
    [indicatorId],
  );
  if (!row[0]?.max) return false;
  const last = new Date(row[0].max).getTime();
  return Date.now() - last < STALE_HOURS * 3600 * 1000;
}

async function runOne(ind: typeof INDICATORS[number]) {
  if (isFresh(ind.id)) {
    return { ok: true as const, count: 0, skipped: true };
  }
  const t0 = Date.now();
  const pts = await fetchIndicator(ind.sourceId, FOCUS_COUNTRIES, FROM_YEAR, new Date().getFullYear());
  const now = new Date().toISOString();
  for (const p of pts) {
    execute(
      `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
         value=excluded.value, fetched_at=excluded.fetched_at`,
      [p.countryiso3code, ind.id, parseInt(p.date, 10), p.value, now],
    );
  }
  return { ok: true as const, count: pts.length, skipped: false, ms: Date.now() - t0 };
}

/** Simple worker pool — runs at most `CONCURRENCY` tasks in parallel. */
async function pool<T>(items: T[], worker: (item: T) => Promise<unknown>): Promise<void> {
  const queue = [...items];
  const inFlight: Promise<void>[] = [];
  const launch = async () => {
    while (queue.length) {
      const item = queue.shift() as T;
      await worker(item);
    }
  };
  for (let i = 0; i < Math.min(CONCURRENCY, items.length); i++) {
    inFlight.push(launch());
  }
  await Promise.all(inFlight);
}

async function main() {
  const t0 = Date.now();
  console.log("🚀 India Dashboard — data ingestion starting...\n");

  getDb(); // run migrations
  await seedStatic();

  const knownRows = query<{ iso3: string }>(`SELECT iso3 FROM countries`);
  const knownCountries = new Set(knownRows.map((r) => r.iso3));

  const wbIndicators = INDICATORS.filter((i) => i.source === "world_bank");
  console.log(`\n📥 Fetching ${wbIndicators.length} World Bank indicators for ${FOCUS_COUNTRIES.length} countries (${CONCURRENCY} parallel)...\n`);

  let totalPoints = 0;
  let successes   = 0;
  let failures    = 0;
  let skipped     = 0;

  await pool(wbIndicators, async (ind) => {
    try {
      const r = await runOne(ind);
      if (r.skipped) {
        skipped += 1;
        console.log(`  ⏭  ${ind.id.padEnd(22)} (fresh, skipped)`);
      } else {
        totalPoints += r.count;
        successes   += 1;
        console.log(`  ✓ ${ind.id.padEnd(22)} ${String(r.count).padStart(4)} pts  (${r.ms}ms)`);
      }
    } catch (err) {
      failures += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ${ind.id.padEnd(22)} FAILED: ${msg}`);
    }
  });

  // ── UNDP HDR CSV ────────────────────────────────────────────
  console.log(`\n📥 Ingesting UNDP HDR data...`);
  try {
    await downloadUndpCsvAsync();
    const undpPoints = parseUndpCsv(
      path.join(process.cwd(), "data", "raw", "undp_hdr.csv"),
    );
    const varMap = getUndpVariableMap();
    let undpInserted = 0;
    const now = new Date().toISOString();
    for (const pt of undpPoints) {
      const mapped = varMap[pt.variable];
      if (!mapped) continue;
      execute(
        `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
           value=excluded.value, fetched_at=excluded.fetched_at`,
        [pt.iso3, mapped.id, pt.year, pt.value, now],
      );
      undpInserted++;
    }
    totalPoints += undpInserted;
    successes++;
    console.log(`  ✓ UNDP HDR ${String(undpInserted).padStart(4)} pts`);
  } catch (err) {
    failures++;
    console.log(`  ✗ UNDP HDR FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── WHO ──────────────────────────────────────────────────────
  console.log(`\n📥 Ingesting WHO data...`);
  const whoIndicators = INDICATORS.filter((i) => i.source === "who");
  for (const ind of whoIndicators) {
    try {
      if (isFresh(ind.id)) {
        skipped++;
        console.log(`  ⏭  ${ind.id.padEnd(22)} (fresh, skipped)`);
        continue;
      }
      const pts = (await fetchWhoIndicatorData(ind.id)).filter((p) => knownCountries.has(p.iso3));
      const now = new Date().toISOString();
      for (const p of pts) {
        execute(
          `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
             value=excluded.value, fetched_at=excluded.fetched_at`,
          [p.iso3, ind.id, p.year, p.value, now],
        );
      }
      totalPoints += pts.length;
      successes++;
      console.log(`  ✓ ${ind.id.padEnd(22)} ${String(pts.length).padStart(4)} pts`);
    } catch (err) {
      failures++;
      console.log(`  ✗ ${ind.id.padEnd(22)} FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── ITU ──────────────────────────────────────────────────────
  console.log(`\n📥 Ingesting ITU data...`);
  const ituIndicators = INDICATORS.filter((i) => i.source === "itu");
  for (const ind of ituIndicators) {
    try {
      if (isFresh(ind.id)) {
        skipped++;
        console.log(`  ⏭  ${ind.id.padEnd(22)} (fresh, skipped)`);
        continue;
      }
      const pts = await fetchItuData(ind.id);
      const now = new Date().toISOString();
      for (const p of pts) {
        execute(
          `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
             value=excluded.value, fetched_at=excluded.fetched_at`,
          [p.iso3, ind.id, p.year, p.value, now],
        );
      }
      totalPoints += pts.length;
      successes++;
      console.log(`  ✓ ${ind.id.padEnd(22)} ${String(pts.length).padStart(4)} pts`);
    } catch (err) {
      failures++;
      console.log(`  ✗ ${ind.id.padEnd(22)} FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── OWID CO2 ─────────────────────────────────────────────────
  console.log(`\n📥 Ingesting OWID CO2 data...`);
  const owidIndicators = INDICATORS.filter((i) => i.source === "owid");
  for (const ind of owidIndicators) {
    try {
      if (isFresh(ind.id)) {
        skipped++;
        console.log(`  ⏭  ${ind.id.padEnd(22)} (fresh, skipped)`);
        continue;
      }
      const pts = (await fetchOwidCo2Data(ind.id)).filter((p) => knownCountries.has(p.iso3));
      const now = new Date().toISOString();
      for (const p of pts) {
        execute(
          `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
             value=excluded.value, fetched_at=excluded.fetched_at`,
          [p.iso3, ind.id, p.year, p.value, now],
        );
      }
      totalPoints += pts.length;
      successes++;
      console.log(`  ✓ ${ind.id.padEnd(22)} ${String(pts.length).padStart(4)} pts`);
    } catch (err) {
      failures++;
      console.log(`  ✗ ${ind.id.padEnd(22)} FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── WIPO ─────────────────────────────────────────────────────
  console.log(`\n📥 Ingesting WIPO data...`);
  const wipoIndicators = INDICATORS.filter((i) => i.source === "wipo");
  for (const ind of wipoIndicators) {
    try {
      if (isFresh(ind.id)) {
        skipped++;
        console.log(`  ⏭  ${ind.id.padEnd(22)} (fresh, skipped)`);
        continue;
      }
      const pts = await fetchWipoData(ind.id);
      const now = new Date().toISOString();
      for (const p of pts) {
        execute(
          `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
             value=excluded.value, fetched_at=excluded.fetched_at`,
          [p.iso3, ind.id, p.year, p.value, now],
        );
      }
      totalPoints += pts.length;
      successes++;
      console.log(`  ✓ ${ind.id.padEnd(22)} ${String(pts.length).padStart(4)} pts`);
    } catch (err) {
      failures++;
      console.log(`  ✗ ${ind.id.padEnd(22)} FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const totals = query<{ n: number }>(`SELECT COUNT(*) AS n FROM data_points`);
  console.log(`\n✅ Done in ${elapsed}s`);
  console.log(`   ${successes} fetched, ${skipped} skipped, ${failures} failed, ${totalPoints} new points.`);
  console.log(`   DB now contains ${totals[0]?.n ?? 0} data points.`);
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
