# AI Agent Context — India Dashboard

## Purpose

Full-stack Next.js dashboard tracking India's global indicator rankings.

## Architecture

Monolithic Next.js 16 App Router. Server components first. Single DB layer (`src/lib/db`). Auto-detects SQLite/PG via `DATABASE_URL`.

## Tech stack

Next.js 16, React 19, TS 5 strict, Tailwind 4, shadcn/ui, Recharts, D3, node:sqlite/pg, Vitest, Playwright.

## Entry points

- `src/app/layout.tsx` — root layout.
- `src/app/page.tsx` — home.
- `src/lib/db/client.ts` — DB driver.
- `scripts/ingest.ts` — data pipeline.

## Critical directories

- `src/lib/db` — all SQL.
- `src/lib/data/indicators.ts` — registry.
- `src/lib/data/sources/*` — fetchers.
- `src/app/api` — route handlers.
- `src/components/dashboard` — widgets.

## Module relationships

Pages → queries.ts → client.ts → DB. Ingestion → sources → bulkInsert. AI → vector-search → embeddings table + Groq.

## DB overview

Tables: countries, indicators, data_points, sources, embeddings. See `07-database-documentation.md`.

## API conventions

REST JSON under `/api/*`. No auth. Params via query string or JSON body. See `08-api-documentation.md`.

## Coding standards

- Strict TS, `@/*` alias.
- Server components default; `"use client"` only when needed.
- All DB access via queries.ts.
- Shared `fmtValue` for formatting.
- `isHigherBetter` for direction-aware ranks.

## Naming

- Indicator ids: snake_case.
- Component files: kebab-case.
- Types: PascalCase.

## Error handling

AI functions return null on failure; ingestion continues on errors. No global error boundary.

## Auth

None.

## Testing

`npm test` (Vitest). E2E needs dev server on port 3456.

## Build/run commands

`npm run dev`, `npm run build`, `npm run ingest`, `npm run status`, `npm run index-embeddings`.

## Business rules

- Indicator registry drives ingestion + UI.
- Lower-is-better indicators (mortality, pollution, etc.) rank ascending.
- Competition ranking: ties share rank.
- Report card scores via percentile (rank/total).

## Known limitations

- Production DB dead (Supabase host ENOTFOUND).
- 20 indicators at 0 points.
- No auth.
- vectorSearch loads 50k rows per request.

## Common pitfalls

- Editing SQL in pages instead of queries.ts.
- Forgetting `READY_SOURCES` when adding indicator.
- Using stale `.env.local` placeholder DATABASE_URL.
- Next.js 16 breaking changes.

## Files requiring extra care

- `src/lib/db/client.ts` (schema + driver).
- `src/lib/data/indicators.ts` (registry).
- `src/lib/rank-direction.ts` (direction map must stay in sync).

## Safe modification guidelines

- Don't change business logic in docs task.
- Run `npm test` and `npm run build` after changes.
- Keep changes minimal and consistent.
- Don't commit secrets or `.env`.
