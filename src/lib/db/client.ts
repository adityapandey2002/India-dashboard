/**
 * Database client — thin wrapper around Node's built-in SQLite.
 *
 * Uses node:sqlite (Node 22+). Works on Vercel with Node 22 runtime.
 * PostgreSQL migration available via pg-client.ts when needed.
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "india.db");

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;

  const fs = require("node:fs") as typeof import("node:fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new DatabaseSync(DB_PATH);
  _db.exec("PRAGMA journal_mode = WAL;");
  _db.exec("PRAGMA foreign_keys = ON;");
  _db.exec("PRAGMA synchronous = NORMAL;");

  runMigrations(_db);
  return _db;
}

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

function runMigrations(db: DatabaseSync): void {
  db.exec(`
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
      country_iso3  TEXT NOT NULL REFERENCES countries(iso3),
      indicator_id  TEXT NOT NULL REFERENCES indicators(id),
      year          INTEGER NOT NULL,
      value         REAL,
      rank          INTEGER,
      fetched_at    TEXT NOT NULL,
      PRIMARY KEY (country_iso3, indicator_id, year)
    );

    CREATE INDEX IF NOT EXISTS idx_data_points_indicator_year
      ON data_points (indicator_id, year);
    CREATE INDEX IF NOT EXISTS idx_data_points_country_year
      ON data_points (country_iso3, year);

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
    CREATE INDEX IF NOT EXISTS idx_embeddings_indicator ON embeddings (indicator_id);
  `);
}
