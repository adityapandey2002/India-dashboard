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
import { fetchOwidCo2Data } from "../src/lib/data/sources/owid";
import { fetchWgiData } from "../src/lib/data/sources/wgi";
import { fetchTiCpi } from "../src/lib/data/sources/ti";
import { fetchUnEGov } from "../src/lib/data/sources/un-egov";
import { fetchOwidIndicators } from "../src/lib/data/sources/owid-generic";
import { fetchNumbeoIndices } from "../src/lib/data/sources/numbeo";
import { fetchExtraIndicators } from "../src/lib/data/sources/extra";
import { fetchSdgIndex } from "../src/lib/data/sources/sdg";

const FOCUS_COUNTRIES = [
  "IND", "USA", "CHN", "JPN", "DEU", "GBR", "FRA", "BRA", "RUS", "CAN",
  "AUS", "KOR", "ITA", "MEX", "IDN", "TUR", "SAU", "CHE", "NLD", "ZAF",
  "ARG", "SWE", "NOR", "ESP", "SGP", "BGD", "PAK", "LKA", "NPL", "BTN",
];

const SOURCES = [
  { id: "world_bank", name: "World Bank Open Data", url: "https://data.worldbank.org/", type: "api" },
  { id: "undp",       name: "UNDP Human Development Reports", url: "https://hdr.undp.org/", type: "api" },
  { id: "who",        name: "World Health Organization GHO", url: "https://www.who.int/data/gho", type: "api" },
  { id: "wef",        name: "World Economic Forum", url: "https://www.weforum.org/", type: "api" },
  { id: "ti",         name: "Transparency International CPI", url: "https://www.transparency.org/", type: "api" },
  { id: "un",         name: "UN E-Government Survey", url: "https://publicadministration.un.org/egovkb/", type: "api" },
  { id: "ei",         name: "Economist Intelligence Unit", url: "https://www.eiu.com/", type: "api" },
  { id: "ihme",       name: "IHME Global Health Data", url: "https://www.healthdata.org/", type: "api" },
  { id: "oecd",       name: "OECD PISA", url: "https://www.oecd.org/pisa/", type: "api" },
  { id: "rsf",        name: "Reporters Without Borders", url: "https://rsf.org/", type: "api" },
  { id: "heritage",   name: "Heritage Foundation", url: "https://www.heritage.org/", type: "api" },
  { id: "iep",        name: "Institute for Economics & Peace", url: "https://www.economicsandpeace.org/", type: "api" },
  { id: "wjp",        name: "World Justice Project", url: "https://worldjusticeproject.org/", type: "pdf" },
  { id: "yale",       name: "Yale Environmental Performance Index", url: "https://epi.yale.edu/", type: "pdf" },
  { id: "germanwatch",name: "Germanwatch CCPI", url: "https://www.germanwatch.org/", type: "pdf" },
  { id: "numbeo",     name: "Numbeo", url: "https://www.numbeo.com/", type: "api" },
  { id: "gtd",        name: "Global Terrorism Database", url: "https://www.start.umd.edu/gtd/", type: "api" },
  { id: "inform",     name: "INFORM Risk Index", url: "https://drmkc.jrc.ec.europa.eu/inform-index/", type: "api" },
  { id: "ibp",        name: "International Budget Partnership", url: "https://internationalbudget.org/", type: "api" },
  { id: "imd",        name: "IMD World Competitiveness", url: "https://www.imd.org/", type: "pdf" },
  { id: "oxford",     name: "Oxford Insights AI Readiness", url: "https://www.oxfordinsights.com/", type: "pdf" },
  { id: "sspi",       name: "Social Progress Imperative", url: "https://www.socialprogress.org/", type: "pdf" },
  { id: "sdg",        name: "SDG Transformation Center", url: "https://sdgtransformationcenter.org/", type: "pdf" },
  { id: "iqair",      name: "IQAir", url: "https://www.iqair.com/", type: "api" },
  { id: "turtle",     name: "Portulans Institute", url: "https://portulansinstitute.org/", type: "pdf" },
  { id: "startupblink", name: "StartupBlink", url: "https://www.startupblink.com/", type: "api" },
  { id: "ookla",      name: "Ookla Speedtest", url: "https://www.speedtest.net/", type: "api" },
  { id: "qs",         name: "QS World University Rankings", url: "https://www.qs.com/", type: "pdf" },
  { id: "od",         name: "Open Data Watch", url: "https://opendatawatch.com/", type: "pdf" },
  { id: "itu",        name: "ITU ICT Development", url: "https://www.itu.int/", type: "api" },
  { id: "wipo",       name: "WIPO Global Innovation Index", url: "https://www.wipo.int/", type: "pdf" },
  { id: "vdem",       name: "V-Dem Institute", url: "https://www.v-dem.net/", type: "api" },
];

const CONCURRENCY = 5;
const STALE_HOURS = 24;
const FROM_YEAR = 2010;

async function seedStatic() {
  console.log("📚 Seeding source registry...");
  for (const s of SOURCES) {
    await execute(
      `INSERT INTO sources (id, name, url, type) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, url=excluded.url, type=excluded.type`,
      [s.id, s.name, s.url, s.type],
    );
  }

  console.log("📊 Seeding indicator registry...");
  for (const ind of INDICATORS) {
    await execute(
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
    await execute(
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
async function isFresh(indicatorId: string): Promise<boolean> {
  const row = await query<{ max: string | null }>(
    `SELECT MAX(fetched_at) AS max FROM data_points WHERE indicator_id = ?`,
    [indicatorId],
  );
  if (!row[0]?.max) return false;
  const last = new Date(row[0].max).getTime();
  return Date.now() - last < STALE_HOURS * 3600 * 1000;
}

async function runOne(ind: typeof INDICATORS[number]) {
  if (await isFresh(ind.id)) {
    return { ok: true as const, count: 0, skipped: true };
  }
  const t0 = Date.now();
  const pts = await fetchIndicator(ind.sourceId, FOCUS_COUNTRIES, FROM_YEAR, new Date().getFullYear());
  const now = new Date().toISOString();
  for (const p of pts) {
    await execute(
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

  await getDb();
  await seedStatic();

  const knownRows = await query<{ iso3: string }>(`SELECT iso3 FROM countries`);
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
    const undpPoints = parseUndpCsv(path.join(process.cwd(), "data", "raw", "undp_hdr.csv"));
    const varMap = getUndpVariableMap();
    let undpInserted = 0;
    const now = new Date().toISOString();
    for (const pt of undpPoints) {
      const mapped = varMap[pt.variable];
      if (!mapped) continue;
      await execute(
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
      if (await isFresh(ind.id)) {
        skipped++;
        console.log(`  ⏭  ${ind.id.padEnd(22)} (fresh, skipped)`);
        continue;
      }
      const pts = (await fetchWhoIndicatorData(ind.id)).filter((p) => knownCountries.has(p.iso3));
      const now = new Date().toISOString();
      for (const p of pts) {
        await execute(
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
  const owidExtra = ["co2_emissions_total"];
  const allOwidIndicators = [...owidIndicators, ...INDICATORS.filter((i) => owidExtra.includes(i.id))];
  for (const ind of allOwidIndicators) {
    try {
      if (await isFresh(ind.id)) {
        skipped++;
        console.log(`  ⏭  ${ind.id.padEnd(22)} (fresh, skipped)`);
        continue;
      }
      const pts = (await fetchOwidCo2Data(ind.id)).filter((p) => knownCountries.has(p.iso3));
      const now = new Date().toISOString();
      for (const p of pts) {
        await execute(
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

  // ── WGI ─────────────────────────────────────────────────────
  console.log(`\n📥 Ingesting WGI governance data...`);
  try {
    const wgiIndIds = INDICATORS.filter((i) => i.source === "wgi").map((i) => i.id);
    if (wgiIndIds.length > 0) {
      const allFresh = await Promise.all(wgiIndIds.map((id) => isFresh(id))).then((r) => r.every(Boolean));
      if (!allFresh) {
        const wgiPts = (await fetchWgiData()).filter((p) => knownCountries.has(p.iso3));
        const now = new Date().toISOString();
        let inserted = 0;
        for (const p of wgiPts) {
          if (!wgiIndIds.includes(p.indicatorId)) continue;
          await execute(
            `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
               value=excluded.value, fetched_at=excluded.fetched_at`,
            [p.iso3, p.indicatorId, p.year, p.value, now],
          );
          inserted++;
        }
        totalPoints += inserted;
        successes++;
        console.log(`  ✓ WGI governance ${String(inserted).padStart(4)} pts`);
      } else {
        skipped++;
        console.log(`  ⏭  WGI governance (fresh, skipped)`);
      }
    }
  } catch (err) {
    failures++;
    console.log(`  ✗ WGI FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── OWID Generic Datasets ──────────────────────────────────
  console.log(`\n📥 Ingesting OWID generic datasets...`);
  try {
    const owidIndicators = INDICATORS.filter((i) =>
      ["wef", "ei", "ihme", "oecd", "rsf", "heritage", "iep", "gtd", "ibp", "inform"].includes(i.source)
    );
    if (owidIndicators.length > 0) {
      const allFresh = await Promise.all(owidIndicators.map((i) => isFresh(i.id))).then((r) => r.every(Boolean));
      if (!allFresh) {
        const owidPts = (await fetchOwidIndicators()).filter((p) => knownCountries.has(p.iso3));
        const now = new Date().toISOString();
        let inserted = 0;
        for (const p of owidPts) {
          await execute(
            `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
               value=excluded.value, fetched_at=excluded.fetched_at`,
            [p.iso3, p.indicatorId, p.year, p.value, now],
          );
          inserted++;
        }
        totalPoints += inserted;
        successes++;
        console.log(`  ✓ OWID generic ${String(inserted).padStart(4)} pts`);
      } else {
        skipped++;
        console.log(`  ⏭  OWID generic (fresh, skipped)`);
      }
    }
  } catch (err) {
    failures++;
    console.log(`  ✗ OWID generic FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Numbeo Indices ──────────────────────────────────────────
  console.log(`\n📥 Ingesting Numbeo indices...`);
  try {
    const numbeoIndicators = INDICATORS.filter((i) => i.source === "numbeo");
    if (numbeoIndicators.length > 0) {
      const allFresh = await Promise.all(numbeoIndicators.map((i) => isFresh(i.id))).then((r) => r.every(Boolean));
      if (!allFresh) {
        const numbeoPts = (await fetchNumbeoIndices()).filter((p) => knownCountries.has(p.iso3));
        const now = new Date().toISOString();
        let inserted = 0;
        for (const p of numbeoPts) {
          await execute(
            `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
               value=excluded.value, fetched_at=excluded.fetched_at`,
            [p.iso3, p.indicatorId, p.year, p.value, now],
          );
          inserted++;
        }
        totalPoints += inserted;
        successes++;
        console.log(`  ✓ Numbeo ${String(inserted).padStart(4)} pts`);
      } else {
        skipped++;
        console.log(`  ⏭  Numbeo (fresh, skipped)`);
      }
    }
  } catch (err) {
    failures++;
    console.log(`  ✗ Numbeo FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── TI Corruption Perceptions Index ─────────────────────────
  console.log(`\n📥 Ingesting TI Corruption Perceptions Index...`);
  try {
    const tiIndicators = INDICATORS.filter((i) => i.source === "ti");
    if (tiIndicators.length > 0) {
      const allFresh = await Promise.all(tiIndicators.map((i) => isFresh(i.id))).then((r) => r.every(Boolean));
      if (!allFresh) {
        const tiPts = (await fetchTiCpi()).filter((p) => knownCountries.has(p.iso3));
        const now = new Date().toISOString();
        let inserted = 0;
        for (const p of tiPts) {
          await execute(
            `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
               value=excluded.value, fetched_at=excluded.fetched_at`,
            [p.iso3, p.indicatorId, p.year, p.value, now],
          );
          inserted++;
        }
        totalPoints += inserted;
        successes++;
        console.log(`  ✓ TI CPI ${String(inserted).padStart(4)} pts`);
      } else {
        skipped++;
        console.log(`  ⏭  TI CPI (fresh, skipped)`);
      }
    }
  } catch (err) {
    failures++;
    console.log(`  ✗ TI CPI FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── UN E-Government ────────────────────────────────────────
  console.log(`\n📥 Ingesting UN E-Government data...`);
  try {
    const unIndicators = INDICATORS.filter((i) => i.source === "un");
    if (unIndicators.length > 0) {
      const allFresh = await Promise.all(unIndicators.map((i) => isFresh(i.id))).then((r) => r.every(Boolean));
      if (!allFresh) {
        const unPts = (await fetchUnEGov()).filter((p) => knownCountries.has(p.iso3));
        const now = new Date().toISOString();
        let inserted = 0;
        for (const p of unPts) {
          await execute(
            `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
               value=excluded.value, fetched_at=excluded.fetched_at`,
            [p.iso3, p.indicatorId, p.year, p.value, now],
          );
          inserted++;
        }
        totalPoints += inserted;
        successes++;
        console.log(`  ✓ UN E-Gov ${String(inserted).padStart(4)} pts`);
      } else {
        skipped++;
        console.log(`  ⏭  UN E-Gov (fresh, skipped)`);
      }
    }
  } catch (err) {
    failures++;
    console.log(`  ✗ UN E-Gov FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── Extra Indicators (OWID grapher: democracy_idx, rule_of_law, refugee, etc.) ──
  console.log(`\n📥 Ingesting extra OWID grapher indicators...`);
  try {
    const extraIndicatorIds = ["democracy_idx", "rule_of_law", "refugee_population", "multidim_poverty"];
    const extraTargets = INDICATORS.filter((i) => extraIndicatorIds.includes(i.id));
    if (extraTargets.length > 0) {
      const allFresh = await Promise.all(extraTargets.map((i) => isFresh(i.id))).then((r) => r.every(Boolean));
      if (!allFresh) {
        const extraPts = (await fetchExtraIndicators()).filter((p) => knownCountries.has(p.iso3));
        const now = new Date().toISOString();
        let inserted = 0;
        for (const p of extraPts) {
          await execute(
            `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
               value=excluded.value, fetched_at=excluded.fetched_at`,
            [p.iso3, p.indicatorId, p.year, p.value, now],
          );
          inserted++;
        }
        totalPoints += inserted;
        successes++;
        console.log(`  ✓ Extra OWID grapher ${String(inserted).padStart(4)} pts`);
      } else {
        skipped++;
        console.log(`  ⏭  Extra OWID grapher (fresh, skipped)`);
      }
    }
  } catch (err) {
    failures++;
    console.log(`  ✗ Extra OWID grapher FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── SDG Index Score (SDSN) ────────────────────────────────────
  console.log(`\n📥 Ingesting SDG Index data...`);
  try {
    const sdgIndicators = INDICATORS.filter((i) => i.source === "sdg");
    if (sdgIndicators.length > 0) {
      const allFresh = await Promise.all(sdgIndicators.map((i) => isFresh(i.id))).then((r) => r.every(Boolean));
      if (!allFresh) {
        const sdgPts = (await fetchSdgIndex()).filter((p) => knownCountries.has(p.iso3));
        const now = new Date().toISOString();
        let inserted = 0;
        for (const p of sdgPts) {
          await execute(
            `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET
               value=excluded.value, fetched_at=excluded.fetched_at`,
            [p.iso3, p.indicatorId, p.year, p.value, now],
          );
          inserted++;
        }
        totalPoints += inserted;
        successes++;
        console.log(`  ✓ SDG Index ${String(inserted).padStart(4)} pts`);
      } else {
        skipped++;
        console.log(`  ⏭  SDG Index (fresh, skipped)`);
      }
    }
  } catch (err) {
    failures++;
    console.log(`  ✗ SDG Index FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const totals = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM data_points`);
  console.log(`\n✅ Done in ${elapsed}s`);
  console.log(`   ${successes} fetched, ${skipped} skipped, ${failures} failed, ${totalPoints} new points.`);
  console.log(`   DB now contains ${totals[0]?.n ?? 0} data points.`);
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
