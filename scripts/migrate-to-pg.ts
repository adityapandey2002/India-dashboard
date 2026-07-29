/**
 * SQLite → PostgreSQL migration script.
 *
 * 1. Creates the schema in PostgreSQL
 * 2. Copies all data from SQLite to PostgreSQL
 *
 * Run: npm run migrate-pg
 */

import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { Client } from "pg";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "india.db");

async function main() {
  const t0 = Date.now();
  console.log("Migrating SQLite → PostgreSQL...\n");

  // Connect to both databases
  const sqlite = new DatabaseSync(DB_PATH);
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  console.log("Connected to both databases.\n");

  // 1. Create schema
  console.log("Creating PostgreSQL schema...");
  await pg.query(`
    CREATE TABLE IF NOT EXISTS countries (
      iso3         TEXT PRIMARY KEY,
      iso2         TEXT,
      name         TEXT NOT NULL,
      region       TEXT,
      income_group TEXT,
      latitude     REAL,
      longitude    REAL
    );

    CREATE TABLE IF NOT EXISTS indicators (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      category      TEXT NOT NULL,
      source        TEXT NOT NULL,
      source_id     TEXT NOT NULL,
      unit          TEXT,
      description   TEXT,
      update_freq   TEXT
    );

    CREATE TABLE IF NOT EXISTS data_points (
      country_iso3  TEXT NOT NULL,
      indicator_id  TEXT NOT NULL,
      year          INTEGER NOT NULL,
      value         REAL,
      fetched_at    TEXT NOT NULL,
      PRIMARY KEY (country_iso3, indicator_id, year)
    );
    CREATE INDEX IF NOT EXISTS idx_dp_indicator_year ON data_points (indicator_id, year);
    CREATE INDEX IF NOT EXISTS idx_dp_country_year ON data_points (country_iso3, year);

    CREATE TABLE IF NOT EXISTS sources (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      url       TEXT,
      type      TEXT
    );

    CREATE TABLE IF NOT EXISTS embeddings (
      id            TEXT PRIMARY KEY,
      chunk_text    TEXT NOT NULL,
      source        TEXT NOT NULL,
      indicator_id  TEXT,
      country_iso3  TEXT,
      year          INTEGER,
      embedding     TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_emb_indicator ON embeddings (indicator_id);
  `);

  // 2. Migrate countries
  console.log("\nMigrating countries...");
  const countries = sqlite.prepare("SELECT * FROM countries").all();
  for (const row of countries) {
    await pg.query(
      `INSERT INTO countries (iso3, iso2, name, region, income_group, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (iso3) DO UPDATE SET name = EXCLUDED.name`,
      [row.iso3, row.iso2, row.name, row.region, row.income_group, row.latitude, row.longitude],
    );
  }
  console.log(`  ${countries.length} countries`);

  // 3. Migrate sources
  console.log("Migrating sources...");
  const sources = sqlite.prepare("SELECT * FROM sources").all();
  for (const row of sources) {
    await pg.query(
      `INSERT INTO sources (id, name, url, type) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [row.id, row.name, row.url, row.type],
    );
  }
  console.log(`  ${sources.length} sources`);

  // 4. Migrate indicators
  console.log("Migrating indicators...");
  const indicators = sqlite.prepare("SELECT * FROM indicators").all();
  for (const row of indicators) {
    await pg.query(
      `INSERT INTO indicators (id, name, category, source, source_id, unit, description, update_freq)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [row.id, row.name, row.category, row.source, row.source_id, row.unit, row.description, row.update_freq],
    );
  }
  console.log(`  ${indicators.length} indicators`);

  // 5. Migrate data_points (batched multi-row INSERT)
  console.log("Migrating data points...");
  const totalPts = (sqlite.prepare("SELECT COUNT(*) as n FROM data_points").all() as any[])[0].n;
  const BATCH = 2000;
  let migrated = 0;

  for (let offset = 0; offset < totalPts; offset += BATCH) {
    const batch = sqlite.prepare(
      `SELECT country_iso3, indicator_id, year, value, fetched_at
       FROM data_points ORDER BY country_iso3, indicator_id, year LIMIT ? OFFSET ?`,
    ).all(BATCH, offset) as any[];

    if (batch.length === 0) continue;

    // Build multi-row INSERT
    const values = batch.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(",");
    const params: any[] = [];
    for (const row of batch) {
      params.push(row.country_iso3, row.indicator_id, row.year, row.value, row.fetched_at);
    }

    await pg.query(
      `INSERT INTO data_points (country_iso3, indicator_id, year, value, fetched_at)
       VALUES ${values}
       ON CONFLICT (country_iso3, indicator_id, year) DO UPDATE SET value = EXCLUDED.value`,
      params,
    );

    migrated += batch.length;
    console.log(`  ${migrated}/${totalPts} data points`);
  }

  // 6. Migrate embeddings (batched multi-row INSERT)
  console.log("Migrating embeddings...");
  const totalEmb = (sqlite.prepare("SELECT COUNT(*) as n FROM embeddings").all() as any[])[0].n;
  if (totalEmb > 0) {
    let embMigrated = 0;
    for (let offset = 0; offset < totalEmb; offset += BATCH) {
      const batch = sqlite.prepare(
        `SELECT id, chunk_text, source, indicator_id, country_iso3, year, embedding
         FROM embeddings ORDER BY id LIMIT ? OFFSET ?`,
      ).all(BATCH, offset) as any[];

      if (batch.length === 0) continue;

      const values = batch.map((_, i) => `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`).join(",");
      const params: any[] = [];
      for (const row of batch) {
        params.push(row.id, row.chunk_text, row.source, row.indicator_id, row.country_iso3, row.year, row.embedding);
      }

      await pg.query(
        `INSERT INTO embeddings (id, chunk_text, source, indicator_id, country_iso3, year, embedding)
         VALUES ${values}
         ON CONFLICT (id) DO UPDATE SET chunk_text = EXCLUDED.chunk_text`,
        params,
      );

      embMigrated += batch.length;
    }
    console.log(`  ${embMigrated} embeddings`);
  } else {
    console.log("  No embeddings to migrate");
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nMigration complete in ${elapsed}s`);

  sqlite.close();
  await pg.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
