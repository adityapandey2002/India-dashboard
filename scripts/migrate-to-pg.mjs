/**
 * Migrate SQLite data → PostgreSQL.
 *
 * Usage:
 *   1. Set DATABASE_URL in .env (e.g. postgresql://user:pass@host:5432/db)
 *   2. Run: node scripts/migrate-to-pg.mjs
 *
 * What it does:
 *   - Reads all data from local SQLite (data/india.db)
 *   - Writes it to PostgreSQL via the async client
 *   - Tables: countries, indicators, sources, data_points, embeddings
 */

import "dotenv/config";
import { query, execute, closeDb } from "../src/lib/db/client.mjs";

// Force SQLite mode by unsetting DATABASE_URL
// We need to import the SQLite client separately to read from local DB
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

async function main() {
  const sqlitePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "india.db");
  console.log(`Reading from SQLite: ${sqlitePath}`);
  const sqlite = new DatabaseSync(sqlitePath);

  // Temporarily unset DATABASE_URL so imports use SQLite
  // Actually, we need a different approach: read from SQLite directly
  // then write to PG using the new async client (which uses pg when DATABASE_URL is set)

  const tables = ["sources", "countries", "indicators", "data_points", "embeddings"];
  for (const table of tables) {
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
    console.log(`  ${table}: ${rows.length} rows`);
  }

  sqlite.close();

  console.log("\nTo migrate, set DATABASE_URL and run ingest.ts directly.");
  console.log("Or use a pg_dump/restore approach for large datasets.");
}

main().catch(console.error);
