/**
 * Fast ingestion for newly added indicator sources only.
 *
 * Run with:  npx tsx scripts/ingest-new.ts
 *
 * Covers: trademark_applications (WB IP.TMK.RSCT), patents_per_million +
 * air_quality (OWID grapher), and the 7 composite indices (INFORM, GII,
 * GPI, EPI, NRI, AIRI, SPI). Skips anything refreshed in the last 24h.
 */
import "dotenv/config";
import { bulkInsert, query, getDb } from "../src/lib/db/client";
import { INDICATORS } from "../src/lib/data/indicators";
import { fetchIndicator } from "../src/lib/data/sources/world-bank";
import { fetchExtraIndicators } from "../src/lib/data/sources/extra";
import {
  fetchInformRisk, fetchGiiIndex, fetchGpi, fetchEpi,
  fetchNri, fetchAiReadiness, fetchSpi, resolveIso3,
  type IndicesDataPoint,
} from "../src/lib/data/sources/indices";
import {
  fetchGci, fetchGovtechMaturity, fetchOpenData, fetchEparticipation,
} from "../src/lib/data/sources/extra-indices";

const FOCUS_COUNTRIES = [
  "IND", "USA", "CHN", "JPN", "DEU", "GBR", "FRA", "BRA", "RUS", "CAN",
  "AUS", "KOR", "ITA", "MEX", "IDN", "TUR", "SAU", "CHE", "NLD", "ZAF",
  "ARG", "SWE", "NOR", "ESP", "SGP", "BGD", "PAK", "LKA", "NPL", "BTN",
];
const STALE_HOURS = 24;
const FROM_YEAR = 2010;

async function isFresh(indicatorId: string): Promise<boolean> {
  const row = await query<{ max: string | null }>(
    `SELECT MAX(fetched_at) AS max FROM data_points WHERE indicator_id = ?`,
    [indicatorId],
  );
  if (!row[0]?.max) return false;
  return Date.now() - new Date(row[0].max).getTime() < STALE_HOURS * 3600 * 1000;
}

async function insertRows(rows: Array<[string, string, number, number]>, now: string) {
  return bulkInsert(
    "data_points",
    ["country_iso3", "indicator_id", "year", "value", "fetched_at"],
    rows.map(([iso3, indicatorId, year, value]) => [iso3, indicatorId, year, value, now]),
    "ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET value=excluded.value, fetched_at=excluded.fetched_at",
  );
}

async function main() {
  const t0 = Date.now();
  console.log("🚀 Ingesting newly-added indicator sources...\n");

  await getDb();
  const knownRows = await query<{ iso3: string }>(`SELECT iso3 FROM countries`);
  const knownCountries = new Set(knownRows.map((r) => r.iso3));

  let total = 0;

  // ── World Bank: trademark_applications (IP.TMK.RSCT) ─────────
  const trademark = INDICATORS.find((i) => i.id === "trademark_applications");
  if (trademark && !(await isFresh(trademark.id))) {
    const pts = await fetchIndicator("IP.TMK.RSCT", FOCUS_COUNTRIES, FROM_YEAR, new Date().getFullYear());
    const now = new Date().toISOString();
    total += await insertRows(
      pts.map((p) => [p.countryiso3code, trademark.id, parseInt(p.date, 10), p.value] as [string, string, number, number]),
      now,
    );
    console.log(`  ✓ ${trademark.id.padEnd(22)} ${String(pts.length).padStart(4)} pts`);
  } else {
    console.log(`  ⏭  ${trademark?.id.padEnd(22) ?? ""} (fresh or unknown, skipped)`);
  }

  // ── OWID grapher: patents_per_million, air_quality ──────────
  const extraIds = ["patents_per_million", "air_quality"];
  const extraTargets = INDICATORS.filter((i) => extraIds.includes(i.id));
  if (extraTargets.length > 0) {
    const allFresh = await Promise.all(extraTargets.map((i) => isFresh(i.id))).then((r) => r.every(Boolean));
    if (!allFresh) {
      const pts = (await fetchExtraIndicators()).filter(
        (p) => knownCountries.has(p.iso3) && extraIds.includes(p.indicatorId),
      );
      const now = new Date().toISOString();
      const inserted = await insertRows(
        pts.map((p) => [p.iso3, p.indicatorId, p.year, p.value] as [string, string, number, number]),
        now,
      );
      total += inserted;
      console.log(`  ✓ extra OWID grapher ${String(inserted).padStart(4)} pts`);
    } else {
      console.log(`  ⏭  extra OWID grapher (fresh, skipped)`);
    }
  }

  // ── Composite indices ────────────────────────────────────────
  const countryRows = await query<{ iso3: string; name: string }>(`SELECT iso3, name FROM countries`);
  const nameMap = new Map<string, string>();
  for (const c of countryRows) {
    const norm = c.name.toLowerCase().trim().replace(/[.,'"&]/g, " ").replace(/\s+/g, " ").trim();
    if (!nameMap.has(norm)) nameMap.set(norm, c.iso3);
  }

  const jobs: Array<{ id: string; fn: () => Promise<IndicesDataPoint[]> }> = [
    { id: "disaster_risk",       fn: fetchInformRisk },
    { id: "innovation_idx",      fn: fetchGiiIndex },
    { id: "global_peace",        fn: fetchGpi },
    { id: "epi",                 fn: fetchEpi },
    { id: "network_readiness",   fn: fetchNri },
    { id: "ai_readiness",        fn: fetchAiReadiness },
    { id: "social_progress_idx", fn: fetchSpi },
    { id: "global_competitiveness", fn: fetchGci },
    { id: "govtech_maturity",       fn: fetchGovtechMaturity },
    { id: "open_data",              fn: fetchOpenData },
    { id: "eparticipation",         fn: fetchEparticipation },
  ];

  const now = new Date().toISOString();
  for (const job of jobs) {
    if (await isFresh(job.id)) {
      console.log(`  ⏭  ${job.id.padEnd(22)} (fresh, skipped)`);
      continue;
    }
    const pts = await job.fn();
    const rows: Array<[string, string, number, number]> = [];
    for (const p of pts) {
      const iso3 = p.iso3 ?? (p.name ? resolveIso3(p.name, nameMap) : null);
      if (!iso3 || !knownCountries.has(iso3)) continue;
      rows.push([iso3, p.indicatorId, p.year, p.value]);
    }
    const inserted = await insertRows(rows, now);
    total += inserted;
    console.log(`  ✓ ${job.id.padEnd(22)} ${String(inserted).padStart(4)} pts`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${elapsed}s, ${total} points inserted.`);
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
