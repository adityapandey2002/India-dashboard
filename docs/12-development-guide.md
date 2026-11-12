# 12 — Development Guide

## Commands

- `npm run dev` — dev server.
- `npm run build` / `npm start` — production build/run.
- `npm run lint` — ESLint.
- `npm test` — Vitest unit tests.
- `npm run ingest` / `ingest:new` / `index-embeddings` / `status` — data pipeline.

## Conventions

- TypeScript strict; `@/*` alias to `src/*`.
- Server components by default; add `"use client"` only when needed.
- All DB access through `src/lib/db/queries.ts`; never raw SQL in pages.
- Indicator changes: edit `src/lib/data/indicators.ts` + add fetcher in `src/lib/data/sources/`, then ingest.
- Formatting: shared `fmtValue` in `src/lib/format.ts`.
- Direction-aware ranks: use `isHigherBetter` from `src/lib/rank-direction.ts`.
- Tailwind v4; shadcn components under `src/components/ui`.

## Adding an indicator

1. Add seed to `INDICATORS` in `src/lib/data/indicators.ts`.
2. Add source to `READY_SOURCES` if fetcher exists.
3. Implement fetcher in `src/lib/data/sources/`.
4. Wire into `scripts/ingest.ts`.
5. Run `npm run ingest`.

## Next.js 16

Breaking changes vs older versions. Read `node_modules/next/dist/docs` before non-trivial changes. Heed deprecation notices.
