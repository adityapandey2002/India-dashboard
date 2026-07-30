/**
 * Database client — auto-detects SQLite (local) vs PostgreSQL (Vercel/Supabase).
 *
 * SQLite: Uses node:sqlite (Node 22+) when no DATABASE_URL is set.
 * PostgreSQL: Uses pg when DATABASE_URL is set.
 *
 * Both expose the same async query()/execute() API.
 */

import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "india.db");

let _sqLite: any = null;
let _pgPool: any = null;

function isPg(): boolean {
  return !!process.env.DATABASE_URL;
}

/** Rewrite ? → $N for PG compatibility */
function pgSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function getDb(): Promise<any> {
  if (isPg()) {
    if (!_pgPool) {
      const { Pool } = await import("pg");
      _pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
      await runPgMigrations();
    }
    return _pgPool;
  }

  if (_sqLite) return _sqLite;
  const { DatabaseSync } = await import("node:sqlite");
  const fs = await import("node:fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _sqLite = new DatabaseSync(DB_PATH);
  _sqLite.exec("PRAGMA journal_mode = WAL;");
  _sqLite.exec("PRAGMA foreign_keys = ON;");
  _sqLite.exec("PRAGMA synchronous = NORMAL;");
  runSqliteMigrations(_sqLite);
  return _sqLite;
}

export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (isPg()) {
    const pool = await getDb();
    const result = await pool.query(pgSql(sql), params);
    return result.rows as T[];
  }

  const db = await getDb();
  const stmt = db.prepare(sql);
  return stmt.all(...(params as never[])) as T[];
}

export async function execute(
  sql: string,
  params: unknown[] = [],
): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
  if (isPg()) {
    const pool = await getDb();
    const result = await pool.query(pgSql(sql), params);
    return { changes: result.rowCount ?? 0, lastInsertRowid: 0 };
  }

  const db = await getDb();
  const stmt = db.prepare(sql);
  const result = stmt.run(...(params as never[]));
  return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
}

function runSqliteMigrations(db: any): void {
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

async function runPgMigrations(): Promise<void> {
  const pool = await getDb();

  // Create tables (safe to run concurrently)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS countries (
      iso3         TEXT PRIMARY KEY,
      iso2         TEXT,
      name         TEXT NOT NULL,
      region       TEXT,
      income_group TEXT,
      latitude     DOUBLE PRECISION,
      longitude    DOUBLE PRECISION
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
      value         DOUBLE PRECISION,
      rank          INTEGER,
      fetched_at    TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (country_iso3, indicator_id, year)
    );

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
  `);

  // Create indexes (use DO block to avoid race conditions with IF NOT EXISTS)
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_data_points_indicator_year') THEN
        CREATE INDEX idx_data_points_indicator_year ON data_points (indicator_id, year);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_data_points_country_year') THEN
        CREATE INDEX idx_data_points_country_year ON data_points (country_iso3, year);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_embeddings_indicator') THEN
        CREATE INDEX idx_embeddings_indicator ON embeddings (indicator_id);
      END IF;
    END $$;
  `);
}

export async function closeDb(): Promise<void> {
  if (_pgPool) {
    await _pgPool.end();
    _pgPool = null;
  }
  _sqLite = null;
}
