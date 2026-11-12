# 19 — Performance and Scalability

## Current approach

- Server components reduce client bundle and improve first paint.
- `bulkInsert` batches DB writes (500/chunk) for PG.
- `getLatestRanks` batches rank computation in one round-trip.
- Country page uses 6 round-trips instead of ~220.
- TF-IDF search caps at 50k embeddings.
- World map loads TopoJSON once.

## Potential bottlenecks

- `vectorSearch` loads up to 50k rows into memory per chat request.
- `getGlobalLatest` and coverage queries scan `data_points`.
- No caching layer (TanStack Query present but not heavily used).
- E2E uses 1 worker; full suite slow.

## Scalability notes

- SQLite single-writer; fine for ingestion, not for concurrent writes in prod.
- PG recommended for production.
- Vercel serverless: cold starts; DB connection pooling via `pg` Pool (singleton).
