# AI Agent Context — India Dashboard

## Purpose

Full-stack Next.js dashboard tracking India's global indicator rankings.

## Architecture

Monolithic Next.js 16 App Router. Server components first. Single DB layer (`src/lib/db`). Auto-detects SQLite/PG via `DATABASE_URL`. Middleware rate-limits AI routes.

## Tech stack

Next.js 16, React 19, TS 5 strict, Tailwind 4, shadcn/ui, Recharts, D3, Motion 14, node:sqlite/pg, Vitest, Playwright.

## Entry points

- `src/app/layout.tsx` — root layout.
- `src/app/page.tsx` — home (world map top, then KPIs).
- `src/lib/db/client.ts` — DB driver.
- `src/middleware.ts` — rate limiting.
- `scripts/ingest.ts` — data pipeline.

## Critical directories

- `src/lib/db` — all SQL.
- `src/lib/data/indicators.ts` — registry (123).
- `src/lib/data/sources/*` — fetchers.
- `src/lib/ai` — Groq (runtime model resolution), HF, TF-IDF (memoized).
- `src/lib/format.ts` — fmtValue, fmtMoney, fmtCompact.
- `src/lib/trend.ts` — trend classification.
- `src/app/api` — route handlers.
- `src/components/dashboard` — widgets (comparison tool token field, flow-chips).
- `src/components/ui/flow-chips.tsx` — FlowChips.

## Module relationships

Pages → queries.ts → client.ts → DB. Ingestion → sources → bulkInsert. AI → vector-search → embeddings table + Groq. Middleware → rate-limit buckets.

## DB overview

Tables: countries, indicators, data_points, sources, embeddings. 123 indicators, 117 with data, 252,834 points, 217 countries. See `07-database-documentation.md`.

## API conventions

REST JSON under `/api/*`. No auth. Rate limits on AI routes. Params validated. Errors generic. See `08-api-documentation.md`.

## Coding standards

- Strict TS, `@/*` alias.
- Server components default; `"use client"` only when needed.
- All DB access via queries.ts.
- Shared `fmtValue`/`fmtMoney`/`fmtCompact` for formatting.
- `computeTrend` from `src/lib/trend.ts` for trend classification.
- `isHigherBetter` for direction-aware ranks.
- Groq model resolved at runtime; optional `GROQ_MODEL` override.

## Naming

- Indicator ids: snake_case.
- Component files: kebab-case.
- Types: PascalCase.

## Error handling

AI functions return discriminated result with reason; routes log reason and return generic message. No global error boundary.

## Auth

None.

## Testing

`npm test` (98 tests / 12 files). E2E needs dev server on :3456 (`npx playwright test`, 25 tests / 3 specs).

## Build/run commands

`npm run dev`, `npm run build`, `npm run ingest`, `npm run status`, `npm run index-embeddings`. Dev server for e2e: `npx next dev -p 3456`.

## Business rules

- Indicator registry drives ingestion + UI.
- Lower-is-better indicators rank ascending.
- Competition ranking: ties share rank.
- Report card scores via percentile (rank/total); differs from /rankings true percentile (documented in methodology).
- Trend flat threshold 0.5%.

## Known limitations

- Production DB dead (Supabase host ENOTFOUND).
- 6 indicators at 0 points.
- No auth.
- Rate-limit buckets in-memory (per instance).
- `xlsx` deprecated/CVEs (ingest-only).
- Lint not fully clean (20 errors/24 warnings).

## Common pitfalls

- Editing SQL in pages instead of queries.ts.
- Forgetting `READY_SOURCES` when adding indicator.
- Hardcoding Groq model id (use runtime resolution).
- Using stale `.env.local` placeholder DATABASE_URL.
- Next.js 16 breaking changes.
- Starting dev server on :3000 (conflicts with AMBIENT_SCRIBE); use :3456.

## Files requiring extra care

- `src/lib/db/client.ts` (schema + driver).
- `src/lib/data/indicators.ts` (registry).
- `src/lib/rank-direction.ts` (direction map).
- `src/lib/ai/client.ts` (model resolution).
- `src/middleware.ts` (rate limits).

## Safe modification guidelines

- Run `npm test` and `npm run build` after changes.
- Keep changes minimal and consistent.
- Don't commit secrets or `.env`.
- Update docs when counts/features change.
