# 04 — System Architecture

## Pattern

Monolithic full-stack Next.js application (App Router) with server components, a single
DB access layer, and a pluggable data-ingestion pipeline. No separate backend service.

## Layers

1. **Presentation** — `src/app/*` pages + `src/components/*` (server + client components).
2. **API** — `src/app/api/*` route handlers (JSON).
3. **Domain/lib** — `src/lib/*` (formatting, rankings, report-card, rank-direction, guides, events).
4. **Data access** — `src/lib/db/queries.ts` (all SQL) over `src/lib/db/client.ts` (driver auto-detect).
5. **Ingestion** — `scripts/*` + `src/lib/data/sources/*` → DB.
6. **AI** — `src/lib/ai/*` (Groq, HF, TF-IDF).

## Architecture diagram

```mermaid
flowchart TD
  Sources[Public data sources<br/>WB, WHO, UNDP, OWID, WGI, TI, Numbeo, ...] -->|HTTP/scrape| Ingest[scripts/ingest.ts<br/>parallel fetchers]
  Ingest --> DB[(SQLite local / Postgres remote<br/>countries, indicators, data_points, sources, embeddings)]
  DB --> Queries[src/lib/db/queries.ts]
  Queries --> Pages[src/app/* pages<br/>server components]
  Queries --> API[src/app/api/*<br/>route handlers]
  Pages --> UI[React + shadcn + Recharts + D3]
  API --> UI
  UI --> Browser[Browser]
  Chat[/api/ai/chat] --> TFIDF[TF-IDF vector search<br/>embeddings table]
  Chat --> Groq[Groq LLM]
  TFIDF --> DB
```

## Key design decisions

- **Server components first.** Pages fetch on server; client components only where interactivity needed.
- **One DB layer.** `queries.ts` is the only SQL consumer; `client.ts` auto-detects driver by `DATABASE_URL`.
- **One indicator registry.** `indicators.ts` lists all metrics; ingestion picks them up.
- **Free-first.** Local SQLite, free-tier Vercel, free Groq/HF.
- **Batching.** `bulkInsert` for remote PG; `getLatestRanks` batches ranks in one round-trip.

## Communication

- Browser ↔ Next.js server (HTTP, server-rendered HTML + client fetches to `/api/*`).
- Server ↔ DB (SQL).
- Server ↔ external sources (only during ingestion, not runtime except AI).
- Server ↔ Groq/HF (runtime, for chat/insights).

## Authentication

None implemented. See `09-authentication-and-authorization.md`.
