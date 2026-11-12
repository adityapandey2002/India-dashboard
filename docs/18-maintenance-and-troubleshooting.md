# 18 — Maintenance and Troubleshooting

## Common issues

- **Pages 500 "Error in Server Components render"** — stale `DATABASE_URL` pointing at dead Supabase host. Remove/replace it; run on SQLite locally.
- **`node:sqlite` not found** — Node < 22. Upgrade Node.
- **Ingestion throttling (OWID)** — `owid-generic.ts` fetches sequentially with retries; be patient.
- **Zero-point indicators** — run `npm run status`; 10 have no usable open dataset; 10 need re-ingest (`npm run ingest:new`).
- **Vercel env placeholder** — `.env.local` from Vercel CLI has masked `DATABASE_URL`; doesn't flip driver.

## Maintenance tasks

- Re-run `npm run ingest` to refresh data.
- `npm run index-embeddings` after data changes.
- `npm run status` to check coverage.
- Keep `READY_SOURCES` in sync with fetchers.

## DB maintenance

- SQLite: WAL files `india.db-wal`, `india.db-shm`. Back up the whole `data/` dir.
- PG: standard Postgres backups (not in repo).

## Troubleshooting data

- `scripts/check-remaining.cjs` checks specific indicator point counts.
- `e2e/helpers/db.ts` cross-checks trend computation.
