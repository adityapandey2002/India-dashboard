# 13 — Testing and Quality

## Unit tests (Vitest)

- Config: `vitest.config.ts` (jsdom, globals, setup `src/test/setup.ts`, `@` alias).
- Files:
  - `src/app/api/scatter/route.test.ts`
  - `src/components/dashboard/scatter-chart.test.tsx`
  - `src/components/dashboard/country-trend-card.test.tsx`
  - `src/lib/format.test.ts`
  - `src/lib/rankings.test.ts`
  - `src/lib/report-card.test.ts`
- Run: `npm test` (vitest run). 41 tests passing (per AGENTS.md).

## E2E (Playwright)

- Config: `playwright.config.ts` (baseURL http://localhost:3456, 1 worker, headless Chromium).
- Specs: `e2e/health.spec.ts`, `e2e/flows.spec.ts`.
- Helpers: `e2e/helpers/{pages,health,db}.ts`.
- Run requires dev server running manually (no webServer config).

## Lint

- `npm run lint` (ESLint 9 flat config).

## Type check

- `tsc` via build; `npm run build` validates.

## Quality notes

- Tests use mocked DB for scatter route; scatter-chart mocks fetch + ResponsiveContainer.
- E2E cross-checks trend icon direction against SQLite via `e2e/helpers/db.ts`.
