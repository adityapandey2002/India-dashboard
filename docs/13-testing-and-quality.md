# 13 — Testing and Quality

## Unit tests (Vitest)

- Config: `vitest.config.ts` (jsdom, globals, setup `src/test/setup.ts`, `@` alias).
- Files (12): scatter route, scatter-chart, country-trend-card, format, rankings, report-card, flow-chips, comparison-tool, vector-search, client (ai), insights route, trend.
- Run: `npm test` (vitest run). 98 tests passing.

## E2E (Playwright)

- Config: `playwright.config.ts` (baseURL http://localhost:3456, 1 worker, headless Chromium).
- Specs: `e2e/health.spec.ts`, `e2e/flows.spec.ts`, `e2e/compare-tokens.spec.ts` (25 tests / 3 specs).
- Helpers: `e2e/helpers/{pages,health,db}.ts`.
- Run requires dev server on :3456 (no webServer block). `npx playwright test`.

## Lint

- `npm run lint` (ESLint 9 flat config). Compare page + flow-chips clean; 20 errors/24 warnings remain elsewhere (see AGENTS.md).

## Type check

- `tsc` via build; `npm run build` validates.

## Quality notes

- Tests use mocked DB for scatter route; scatter-chart mocks fetch + ResponsiveContainer.
- E2E cross-checks trend icon direction against SQLite via `e2e/helpers/db.ts`.
- AI client tests cover model resolution, reasons, cache, self-heal.
