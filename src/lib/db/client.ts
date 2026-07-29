/**
 * Database client — thin wrapper around Node's built-in SQLite.
 *
 * Why node:sqlite (and not better-sqlite3 / Drizzle yet)?
 *  - Zero install — Node 22+ ships it natively. No native compilation pain.
 *  - We can swap to Drizzle + Postgres later. The schema (src/lib/db/schema.ts)
 *    is just TypeScript types, so migration is a 1-file change.
 *  - For a solo dev, less magic = easier to debug.
 *
 * When we move to Postgres (Supabase free tier), we'll:
 *  1. Run drizzle-kit to generate SQL migrations
 *  2. Point this file at `process.env.DATABASE_URL`
 *  3. Replace the query() implementation with `pg`
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "india.db");

// Singleton — open the DB once per process, reuse across requests.
let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;

  // Ensure data folder exists
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new DatabaseSync(DB_PATH);

  // Sensible defaults for a small analytics DB
  _db.exec("PRAGMA journal_mode = WAL;");      // better concurrency
  _db.exec("PRAGMA foreign_keys = ON;");      // respect FK constraints
  _db.exec("PRAGMA synchronous = NORMAL;");   // faster writes, still safe

  // Run migrations (idempotent — every CREATE uses IF NOT EXISTS)
  runMigrations(_db);

  return _db;
}

/**
 * Tiny query helper. We use prepared statements so the same SQL is
 * compiled once and re-used. SQLite caches them automatically.
 */
export function query<T = unknown>(sql: string, params: unknown[] = []): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.all(...(params as never[])) as T[];
}

export function execute(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number | bigint } {
  const db = getDb();
  const stmt = db.prepare(sql);
  const result = stmt.run(...(params as never[]));
  return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
}

/**
 * Idempotent migrations. Add new tables / indexes here as we grow.
 * In production we'd use proper migration files, but for a solo dev
 * this is good enough — every statement must be safe to re-run.
 */
function runMigrations(db: DatabaseSync): void {
  db.exec(`
    -- Countries — every nation we have data for.
    CREATE TABLE IF NOT EXISTS countries (
      iso3         TEXT PRIMARY KEY,        -- "IND", "USA", "CHN"
      iso2         TEXT,                    -- "IN", "US", "CN"
      name         TEXT NOT NULL,
      region       TEXT,                    -- "Asia", "Europe", ...
      income_group TEXT,                    -- "Lower middle income", etc.
      latitude     REAL,
      longitude    REAL
    );

    -- Indicators — the actual metrics we track (GDP, HDI, etc.)
    CREATE TABLE IF NOT EXISTS indicators (
      id            TEXT PRIMARY KEY,       -- "gdp_current_usd"
      name          TEXT NOT NULL,
      category      TEXT NOT NULL,          -- "economy", "health", ...
      source        TEXT NOT NULL,          -- "World Bank", "WHO", ...
      source_id     TEXT NOT NULL,          -- API code, e.g. "NY.GDP.MKTP.CD"
      unit          TEXT,                   -- "USD", "%", "per 1000"
      description   TEXT,
      update_freq   TEXT                    -- "annual", "biennial", ...
    );

    -- Data points — the actual numbers. One row per (country, indicator, year).
    CREATE TABLE IF NOT EXISTS data_points (
      country_iso3  TEXT NOT NULL REFERENCES countries(iso3),
      indicator_id  TEXT NOT NULL REFERENCES indicators(id),
      year          INTEGER NOT NULL,
      value         REAL,                   -- nullable: not all years reported
      rank          INTEGER,                -- optional global rank for that year
      fetched_at    TEXT NOT NULL,          -- ISO timestamp
      PRIMARY KEY (country_iso3, indicator_id, year)
    );

    -- Indexes — these matter once we have 100k+ rows.
    CREATE INDEX IF NOT EXISTS idx_data_points_indicator_year
      ON data_points (indicator_id, year);
    CREATE INDEX IF NOT EXISTS idx_data_points_country_year
      ON data_points (country_iso3, year);

    -- Source registry — for the "show me where this number came from" feature.
    CREATE TABLE IF NOT EXISTS sources (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      url       TEXT,
      type      TEXT                       -- "api", "csv", "pdf", "scrape"
    );

    -- Vector embeddings for RAG chatbot semantic search.
    -- Each row stores a text chunk + its 384-dim embedding (Float32 BLOB).
    CREATE TABLE IF NOT EXISTS embeddings (
      id            TEXT PRIMARY KEY,      -- "vec_<indicator>_<country>_<year>"
      chunk_text    TEXT NOT NULL,
      source        TEXT NOT NULL,         -- citation identifier
      indicator_id  TEXT,
      country_iso3  TEXT,
      year          INTEGER,
      embedding     TEXT                  -- JSON-encoded TF-IDF vector
    );
    CREATE INDEX IF NOT EXISTS idx_embeddings_indicator ON embeddings (indicator_id);
  `);
}
