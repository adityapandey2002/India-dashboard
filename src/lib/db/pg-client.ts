/**
 * PostgreSQL client — used in production (Vercel/Supabase).
 * Mirrors the SQLite client's query/execute interface.
 */

import { Client } from "pg";

let _pg: Client | null = null;

export async function getPgClient(): Promise<Client> {
  if (_pg) return _pg;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  _pg = new Client({ connectionString: url });
  await _pg.connect();
  return _pg;
}

export async function pgQuery<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = await getPgClient();
  const res = await client.query(sql, params);
  return res.rows as T[];
}

export async function pgExecute(
  sql: string,
  params: unknown[] = [],
): Promise<{ changes: number }> {
  const client = await getPgClient();
  const res = await client.query(sql, params);
  return { changes: res.rowCount ?? 0 };
}

export async function pgRunMigrations(): Promise<void> {
  const client = await getPgClient();
  await client.query(`
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
}
