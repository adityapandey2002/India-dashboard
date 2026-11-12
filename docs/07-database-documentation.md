# 07 — Database Documentation

## Engine

- Local: `node:sqlite` (`DatabaseSync`), file at `data/india.db` (WAL mode, FK on, synchronous NORMAL).
- Remote: PostgreSQL via `pg` when `DATABASE_URL` set. Schema created by `runPgMigrations`.

## Tables

### `countries`

| Column | Type | Notes |
|---|---|---|
| iso3 | TEXT PK | 3-letter ISO code |
| iso2 | TEXT | |
| name | TEXT NOT NULL | |
| region | TEXT | |
| income_group | TEXT | |
| latitude | REAL/DOUBLE | |
| longitude | REAL/DOUBLE | |

### `indicators`

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | snake_case id |
| name | TEXT NOT NULL | |
| category | TEXT NOT NULL | economy/society/.../digital_gov |
| source | TEXT NOT NULL | source key (world_bank, undp, ...) |
| source_id | TEXT NOT NULL | upstream id |
| unit | TEXT | |
| description | TEXT | |
| update_freq | TEXT | |

### `data_points`

| Column | Type | Notes |
|---|---|---|
| country_iso3 | TEXT FK→countries | |
| indicator_id | TEXT FK→indicators | |
| year | INTEGER | |
| value | REAL/DOUBLE | nullable |
| rank | INTEGER | nullable (unused mostly) |
| fetched_at | TEXT/TIMESTAMP | |
| PK | (country_iso3, indicator_id, year) | |

Indexes: `idx_data_points_indicator_year`, `idx_data_points_country_year`.

### `sources`

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT NOT NULL | |
| url | TEXT | |
| type | TEXT | api/csv/pdf/scrape |

### `embeddings`

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `${indicatorId}__${iso3}__${year}` |
| chunk_text | TEXT NOT NULL | |
| source | TEXT NOT NULL | |
| indicator_id | TEXT | |
| country_iso3 | TEXT | |
| year | INTEGER | |
| embedding | TEXT | JSON vector (top-50 terms) |

Index: `idx_embeddings_indicator`.

## Relationships

- `data_points.country_iso3` → `countries.iso3`
- `data_points.indicator_id` → `indicators.id`
- `indicators.source` loosely references `sources.id`.

## Migration strategy

- SQLite: `runSqliteMigrations` runs `CREATE TABLE IF NOT EXISTS` on DB open.
- PG: `runPgMigrations` runs equivalent DDL on pool init.
- No separate migration tool (drizzle-kit present but not wired).

## Seeding

- `npm run ingest` seeds sources, indicators, countries, data_points.
- `npm run index-embeddings` seeds embeddings.

## Transaction handling

Not explicit; `bulkInsert` chunks 500 rows. SQLite WAL. No cross-table transactions documented.

## ER diagram

See `docs/diagrams/database-er-diagram.md`.
