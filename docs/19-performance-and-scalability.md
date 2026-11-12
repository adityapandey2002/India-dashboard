# 19 — Performance and Scalability

## Current approach

- Server components reduce client bundle and improve first paint.
- `bulkInsert` batches DB writes (500/chunk) for PG.
- `getLatestRanks` batches rank computation in one round-trip.
- Country page uses 6 round-trips instead of ~220.
- TF-IDF search memoized in module state; invalidated by `COUNT(*)/MAX(id)` fingerprint; no re-parse per request.
- Query vector keeps only top-32 IDF terms; question clamped to 500 chars.
- `fmtCompact` trims trailing zeros for axis ticks (no raw 32000000000000).
- World map loads TopoJSON once.

## Potential bottlenecks

- `vectorSearch` still reads up to 50k rows on first cold request.
- `getGlobalLatest` and coverage queries scan `data_points`.
- No caching layer (TanStack Query present but not heavily used).
- E2E uses 1 worker; full suite slow.

## Scalability notes

- SQLite single-writer; fine for ingestion, not for concurrent writes in prod.
- PG recommended for production.
- Vercel serverless: cold starts; DB connection pooling via `pg` Pool (singleton).
- Rate-limit buckets in-memory (per instance).
