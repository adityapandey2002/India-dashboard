<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# India Dashboard — Setup & Tasks

## Required Environment Variables (.env)
```
DATABASE_PATH=./data/india.db
GROQ_API_KEY=          # For AI chatbot answers (get from console.groq.com)
GROQ_MODEL=            # OPTIONAL — pin the chat model; leave BLANK to auto-detect (recommended!)
HF_API_KEY=            # Optional — HuggingFace token for RAG embeddings (chat works without it)
# DATABASE_URL=        # OPTIONAL — set to a LIVE Supabase PG connection string to run against Postgres
```
⚠️ **Never hardcode a Groq model id.** Groq decommissions models and each key serves a different set, so a hardcoded id silently breaks *every* AI feature while the UI still says "set `GROQ_API_KEY`". `src/lib/ai/client.ts` resolves the model at runtime from `GET /openai/v1/models` (cached 10 min, de-duplicated, `active: false` filtered out, audio/reasoning models excluded). See "AI model resolution" under Security hardening.
⚠️ `.env` no longer contains `DATABASE_URL` — it was removed because the old Supabase host is dead (see "Known issues / deployment status" below). The dev server, `npm run ingest`, `npm run index-embeddings` and `npm run status` all read `.env`, so the **working local DB is SQLite** at `data/india.db` (217 countries, 123 indicators, 117 with data, 252,834 data points). `.env` (gitignored) holds the **real** `GROQ_API_KEY`/`HF_API_KEY`; `.env.example` must stay a placeholder — never copy a live key into it. `.env*` is gitignored.

## Dev server & tests
⚠️ Start the dev server with `npx next dev -p 3456` (NOT `npm run dev`, which is plain `next dev` on :3000): localhost:3000's IPv6 loopback is already owned by an unrelated project (AMBIENT_SCRIBE, a Vite app), so `npm run dev` on :3000 is not reliably reachable as `localhost` in this environment. `playwright.config.ts` also already expects `baseURL: http://localhost:3456` with no `webServer` block, so you must start the server yourself before running e2e.

```bash
npx next dev -p 3456  # dev server for the e2e suite (no auto-start in playwright.config.ts)
npm test               # = npx vitest run → 98 tests / 12 files
npx playwright test    # 25 e2e tests / 3 specs (flows.spec.ts 9 + compare-tokens.spec.ts 7 + health.spec.ts 9)
```

Other dev-environment gotchas:
- **Don't reach the dev server via `127.0.0.1`** unless you add `allowedDevOrigins: ["127.0.0.1"]` to `next.config.ts` (Next 16 option, currently unset — `next.config.ts` is still the stock stub). Next 16 dev otherwise blocks cross-origin dev resources requested from `127.0.0.1`. Use `localhost:3456` instead.
- Playwright browsers are installed locally (chromium under `%LOCALAPPDATA%\ms-playwright`), so `npx playwright test` runs without a separate `playwright install`.

## Data Pipeline
1. `npm run ingest` — Fetch all indicator data from WB, UNDP, WHO, OWID, WGI, TI, Numbeo
2. `npm run ingest:new` — Fast path: only the newest sources (trademark WB, patents/air_quality OWID grapher, 7 composite indices)
3. `npm run index-embeddings` — Build local TF-IDF search index (no API key needed)
4. `npm run status` — Prints data coverage + zero-point indicators (loads dotenv, so reflects the working DB)

## PostgreSQL Migration
The DB client auto-detects PG vs SQLite based on `DATABASE_URL` env var:
- **Local**: No DATABASE_URL set → uses `node:sqlite` (sync-backed async API)
- **Vercel/Supabase**: Set `DATABASE_URL` in env → uses `pg` with `?`→`$N` placeholder rewriting

⚠️ The original Supabase host (`db.fzibhydljxjqrulwwykp.supabase.co`) is **DEAD** — DNS no longer resolves (ENOTFOUND). Any `DATABASE_URL` pointing at it makes every server-rendered page 500 with "Error in Server Components render". Do NOT reuse the old connection string — create a new Supabase project before going back to PG.

`bulkInsert(table, columns, rows, onConflict?)` in `src/lib/db/client.ts` batches multi-row INSERTs — ALWAYS use it for bulk writes to remote PG (per-row `execute` loops are ~100x slower).

To seed PG from scratch (new project):
1. Create a new project on Supabase and copy its connection string
2. Set `DATABASE_URL` in `.env` pointing to the new Supabase PG (use `.env.local` or remove before commit)
3. Run `npm run ingest` — creates schema + inserts all data directly into PG
4. Run `npm run index-embeddings` — builds TF-IDF index in PG
5. Remove `DATABASE_URL` from `.env` (it stays in the Vercel env vars, once those are updated)

⚠️ Do NOT commit `DATABASE_URL` to git (it's in `.gitignore` as `.env*`)

## Vercel Deploy
`vercel --prod` with `GROQ_API_KEY` (and, once fixed, a working `DATABASE_URL`) set in the Vercel project dashboard.

⚠️ The `DATABASE_URL` in Vercel env vars is **unverified and likely stale** (the old Supabase host is dead — see below). Until it is replaced or removed, deployed pages will 500. SQLite is NOT viable on Vercel serverless (ephemeral filesystem, and `data/*.db` is gitignored), so production needs a live PG database.

## Known issues / deployment status
- **Dead Supabase host** — `db.fzibhydljxjqrulwwykp.supabase.co` no longer resolves (ENOTFOUND). Any `DATABASE_URL` pointing at it → every server-rendered page 500s with "Error in Server Components render".
- **Local = SQLite** — `.env` was cleaned (DATABASE_URL removed) and local dev runs on `data/india.db` via `node:sqlite`. All pages verified 200: home, explore, indicator, country, compare, rankings, report-card.
- **Vercel env unverified** — production env vars likely still contain the stale `DATABASE_URL`; the working DB on Vercel is unknown. SQLite is not viable on Vercel serverless (ephemeral FS; `data/*.db` is gitignored) → a new Supabase project + re-seed + env update is required before prod works.
- **Local DB state** — `npm run status` on the live SQLite DB: 217 countries, 123 indicators (117 with data, 6 at 0 pts: `broadband_speed`, `ccpi`, `digital_competitiveness`, `epi`, `qs_rank`, `startup_ecosystem`), 252,834 data points, 34 sources, TF-IDF 50,000 chunks. The previously-missing fetcher-backed indicators (`air_quality`, `patents_per_million`, `trademark_applications`, the composite indices from `indices.ts`) now have data locally.
- **Tests** — `npm test` (`vitest run`): **98 passing across 12 files**; `npx playwright test`: **25 e2e tests across 3 specs** (`e2e/flows.spec.ts` 9 + `e2e/compare-tokens.spec.ts` 7 + `e2e/health.spec.ts` 9, the latter generated from the 8 entries in `CRITICAL_PATHS`). Playwright browsers are installed locally, so no extra install step. The e2e suite expects a dev server already running on **:3456** (see "Dev server & tests" above) — it has no `webServer` block.
- **Lint — compare page fixed, repo not clean** — the old `react-hooks/set-state-in-effect` error on `src/components/dashboard/comparison-tool.tsx` is gone (the `?country=` param is read in a lazy `useState` initializer instead of a mount effect), and `comparison-tool.tsx`, `flow-chips.tsx` and both of their tests are at 0 problems. But `npm run lint` still exits non-zero overall: **20 errors / 24 warnings** across 15 files (`no-explicit-any` in `src/lib/db/client.ts`, `world-map-card.tsx`, `src/app/api/ai/chat/route.ts`, `src/lib/data/sources/sdg.ts`; `no-unused-vars` and `no-require-imports` mostly in `scripts/`; the remaining `set-state-in-effect` in `indicator-trend-dialog.tsx`, plus `react-hooks/immutability` in `world-map-card.tsx`).

## Completed
- PostgreSQL migration: client.ts auto-detects PG/SQLite, all DB calls async, `pg` package installed, `bulkInsert` helper
- Home page: KPI cards with trend arrows, 4 multi-country trend charts, world map with category-grouped indicator selector, dynamic years, scatter correlation chart (`/api/scatter` + `ScatterCard`: pick any two indicators, India highlighted, Pearson r + India percentile chips)
- Responsive nav: `src/components/site-nav.tsx` (`SiteNav` client component, desktop `md:flex` links + mobile Menu/X toggle dropdown) wired into `src/app/layout.tsx`
- Test setup: Vitest 4 + Testing Library (jsdom), `npm test`, config `vitest.config.ts` (`@`→`src` alias, setup `src/test/setup.ts`), plus a Playwright e2e suite in `e2e/` (`@playwright/test`, config `playwright.config.ts`, `npx playwright test`) that asserts real page health — no error overlay, no digest, no console/page errors — across every critical path. 16 passing tests at the time (now **75 across 11 files** — see Known issues) across `/api/scatter` route (mocked DB) + `scatter-chart` component (mocked fetch + recharts ResponsiveContainer)
- Explore page: category filter + search with data coverage stats (sorted: data-rich first), `?category=` query param
- Compare page: multi-country line/bar/radar charts, delta highlights, data table, AI insight panel. Country selection redesigned as a token field + `FlowChips` available-country list — see "Compare page — token-field country selection + FlowChips" below
- Country page: overall global score + grade, category radar vs India (`CountryRadar`), top/bottom performer cards, interactive trend vs India (`CountryTrendCard` via `/api/indicators/series`), category score chips. Uses `getLatestRanks` + `getCountryHistory` (6 round-trips instead of ~220)
- World map: interactive D3 Mercator choropleth with year selector + historical event annotations
- AI Chat: RAG chatbot with TF-IDF vector search + Groq LLM with citations
- Report Card: per-category scoring, ranks, trends, Print/Save PDF + CSV Export. Now: overall A–F grade + score (0–100 percentile-based, `src/lib/report-card.ts` helpers), per-category grade badges + score bars, India vs China radar (`ReportCardRadar`), strongest/weakest callouts, top-5 indicators per category by score. Batching via `getLatestRanks(indicatorIds, iso3s)` in `queries.ts` (one round-trip computes each country's own-latest-year rank per indicator instead of ~110 per-indicator queries)
- ~117 working indicators, 252,834 data points, 34 ready sources
- `education_idx` computed from UNDP eys+mys in `src/lib/data/sources/undp.ts`
- `egov_idx` from World Bank Data360 EGDI CSV (`src/lib/data/sources/un-egov.ts`)
- `sdg_score` from SDSN SDR xlsx repos (`src/lib/data/sources/sdg.ts`)
- `refugee_population`, `multidim_poverty`, `democracy_idx`, `rule_of_law`, `patents_per_million`, `air_quality` from OWID grapher via `extra.ts`
- Composite-index fetchers in `src/lib/data/sources/indices.ts`: `disaster_risk` (HDX INFORM), `innovation_idx` (WIPO GII xlsx 2022-2024), `global_peace` (GPI 2008-2024), `epi` (Yale EPI 2026), `network_readiness` (NRI 2024 xlsx), `ai_readiness` + `social_progress_idx` (name→ISO3 resolution via `resolveIso3`, incl. diacritics/abbreviations overrides)
- `trademark_applications` switched to WB `IP.TMK.RSCT` (working code)
- `scripts/ingest-new.ts` — fast targeted ingest for new sources (also fixable to SQLite by temporarily moving `.env.local` if needed)
- `index-embeddings.ts` now works on PG (uses `bulkInsert` instead of `db.prepare`)
- `owid-generic.ts` fetches datasets sequentially + retries (parallel bursts to raw.githubusercontent.com get throttled)
- `status.ts` loads dotenv (reflects the working DB)
- `xlsx` npm package installed for parsing xlsx data sources
- `NODE_OPTIONS=--no-warnings` in build/ingest/index-embeddings scripts (set CMD syntax on Windows)
- 4 more indicators: `ease_of_doing_business` (WB archived xlsx via `src/lib/data/sources/doing-business.ts`, India 2014–2020), `quality_of_life` + `cost_of_living` (Numbeo QOL page cols 2/6 via `numbeo.ts`, same fetch as `safety_idx`), `womens_economic_participation` (WB `SL.EMP.TOTL.SP.FE.ZS`). 114 indicators with data at that point, ~118k points, 35 sources (current local SQLite counts differ — see "Known issues / deployment status")
- Rankings page (`/rankings`): pick any indicator → full sortable/searchable world ranking table with India highlighted, India rank/percentile/rank-delta cards, and India's rank-over-time chart (reversed Y so rank 1 = top). Backed by `/api/rankings` + pure helpers `src/lib/rankings.ts` (competition ranking, ties share rank) + `src/lib/rank-direction.ts` (which indicators are lower-is-better, e.g. mortality/pollution/ranks). `TrendChart` now keys series by unique internal key so the India page (two "India" series) no longer throws duplicate-key errors.
- Recent cleanup (`1b29d85`, pushed to origin/master): shared `src/lib/format.ts` (`fmtValue`) replaced 5 local copies across the country/indicator/compare/leaderboard/rankings/report-card pages; `getRankInYear` + `getLeaderboard` in `queries.ts` gained a `higherBetter` param so lower-is-better indicators rank correctly (mirrors `rank-direction.ts`); trend-icon direction fix; explore nested-anchor fix; 8 new `format.test.ts` cases — **41 tests passing total** across 6 files.
- Country pages (`/country/[iso3]`): on-demand **"Analyse this country"** AI card (`CountryInsight` → `POST /api/ai/insights`). The route now routes through the shared `chat()` helper (`src/lib/ai/client.ts`) — one Groq code path, `GROQ_API_KEY` guard (503), `iso3` validation (400), generic 500 (no `err.message` leak); dead `generateInsight()` removed and **`groq-sdk` dependency dropped** (`chat()` uses plain fetch). Covered by `src/app/api/ai/insights/route.test.ts`.
- Trend classification single-sourced in `src/lib/trend.ts` (`FLAT_THRESHOLD_PCT = 0.5`, `computeTrend()`) — home KPIs, country pages and the report card (and therefore the report-card CSV export) share one definition; report card's 0.1% threshold was the outlier. `src/lib/trend.test.ts` pins the 0.49/0.5 boundary.
- GDP KPI formatting single-sourced as `fmtMoney()` in `src/lib/format.ts` ("$3.85T" hero style, sign before symbol); local `fmtBig` deleted. `/methodology` now documents BOTH formulas — the report-card score (100 × (total − rank + 1) / total) and the /rankings true percentile (100 × (total − rank) / (total − 1)); JSDoc on `indicatorScore()` and `computeRankings()` explains why they intentionally differ.
- `fmtCompact()` in `src/lib/format.ts` — axis/tick-length number formatter that never forces decimals, it trims trailing zeros (32,000,000,000,000 → `"32T"`, not `"32.00T"`). Used as the `tickFormatter` on the compare page's line + bar Y axes and the radar `PolarRadiusAxis`, so the charts no longer print a raw `32000000000000`. `fmtValue` still formats the chart tooltips, the delta-vs-India rows and the data table, where the extra decimals carry meaning. Pinned by the new `describe("fmtCompact")` block in `format.test.ts` (12 cases incl. null/0/negatives).

## Compare page — token-field country selection + FlowChips
New dependency: **`motion@^14`**, imported as **`motion/react`** (`motion`, `AnimatePresence`). Two consumers: `src/components/ui/flow-chips.tsx` (core of the chip animation) and the compare page's token row.

`src/components/dashboard/comparison-tool.tsx`:
- **Selected countries are removable tokens inside the "Search countries" input** (tag-input pattern), not rows in the list below: each token is a blue `motion.span` with `layout` + enter/exit scale inside an `AnimatePresence initial={false}` wrapper, an `✕` button (`aria-label="Remove <country>"`), and **Backspace on an empty query removes the last token** (`handleSearchKeyDown`). The list below is fed by `availableCountryItems` (memoized: countries minus `selectedSet`, filtered by the search text), so it only ever lists **unselected** countries — it can't reorder itself and the scroll position never jumps.
- The **"Number of countries to compare" control was removed**; the auto-pick size is now the module constant `TOP_COUNTRY_COUNT = 5` (leaderboard fetch uses `?limit=5`, and India is always included in an auto-pick).
- Auto-pick of the top-N countries per indicator (`/api/indicators/leaderboard`) is guarded by `lastUserEditRef`: `toggleCountry` stamps `Date.now()` on every manual click/token removal, and the in-flight fetch compares that stamp against its own start time — so a slow leaderboard response can no longer overwrite a choice the user just made.
- `?country=` is honoured in a **lazy `useState` initializer** (not a mount effect), which is also what removed the old `react-hooks/set-state-in-effect` lint error on this page.
- New shared component **`src/components/ui/flow-chips.tsx`** (`FlowChips`), a `React.memo`-wrapped multi-select pill row built on `motion`: spring `layout` FLIP via the shared exported `flowTransition` (`{type:"spring", stiffness:420, damping:30}`), selected chips sorted to the front, `✓` that pops in via a plain conditional render (no `AnimatePresence` inside `FlowChips` itself), `whileTap` scaling the chip to `0.94`, and a `Set`-based lookup so sorting the 217-country row stays linear instead of O(n²). A11y: `role="group"` + `aria-label` on the row, `aria-pressed` per chip, `focus-visible` ring. On `/compare` it renders the available-country list (`label="Available countries"`); `sortSelectedFirst={false}` and `showCheck={false}` are supported for single-select rows (currently only exercised by the unit tests — `/compare` is the only call site).
- Tests: `src/components/ui/flow-chips.test.tsx` (5), `src/components/dashboard/comparison-tool.test.tsx` (4, token field), `src/lib/ai/vector-search.test.ts` (4, index memo), plus the `fmtCompact` cases in `src/lib/format.test.ts` → **75 vitest tests / 11 files**. `e2e/flows.spec.ts` test 3 now asserts the **"Remove India" token** (and that India is *absent* from the `aria-label="Available countries"` list) instead of a country chip; `e2e/compare-tokens.spec.ts` (7 tests) covers the token field end-to-end, including a regression test that the list scroll position does not jump when a country is selected.

## Security hardening (2026-10-05)
A review pass over the AI surface produced these changes. The compare-page work itself was clean (no `dangerouslySetInnerHTML`, all SQL bound, `motion@14` is MIT and install-script-free); the real exposure was the pre-existing LLM proxy layer.

- **`src/middleware.ts` (new)** rate-limits the unauthenticated LLM proxies: `/api/ai/chat` **15 req/min** and `/api/ai/insights` **30 req/min** per IP → `429` + `Retry-After`. Buckets live in module memory, so they are **per instance** — swap `buckets` for Vercel KV/Upstash once a shared store exists.
- **`src/lib/ai/vector-search.ts`** no longer re-parses the ~50k-row TF-IDF index on *every* request: the parsed index is memoized in module state and invalidated by a cheap `COUNT(*)/MAX(id)` fingerprint. `question` is clamped to 500 chars before `tokenize()` and the query vector keeps only the 32 highest-IDF terms — previously a single anonymous request could pin the event loop. Fixed a latent bug too: malformed embeddings used to desync `docVectors` from `rows`. Tests: `src/lib/ai/vector-search.test.ts` (4).
- **`src/app/api/ai/chat/route.ts`**: `question` must be a non-empty string ≤500 chars (`400`/`413`); `conversationHistory` is reduced to the last 6 messages, each ≤2000 chars, with `role` coerced to `user`/`assistant` (no caller-supplied `system` turn); retrieved context is fenced in `<context>…</context>` with a matching instruction in `SYSTEM_PROMPT`; the catch block now logs server-side and returns a generic message — it used to return `err.message`, which can carry the `DATABASE_URL` password or local paths (`insights/route.ts` was already hardened this way).
- **Read APIs validate params** instead of binding `NaN` as an INTEGER (which produced unhandled 500s): `leaderboard` (`year` integer, `limit` clamped to 1…250), `series` (`^[A-Za-z]{3}$` ISO + `^[a-z0-9_]+$` indicator), `rankings`. All three wrap their DB work in `try/catch` with a generic `500`.
- **`next.config.ts`** sends `Content-Security-Policy` (self-only; `'unsafe-inline'`/`'unsafe-eval'` stay because Next inlines its bootstrap scripts and Turbopack HMR needs `eval`, `ws:`/`wss:` allowed for the dev socket), plus `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- **Deleted the `!process.env.NEXT_PUBLIC_GROQ_KEY && …` hint** in `comparison-tool.tsx`: `NEXT_PUBLIC_*` is inlined into the client bundle at build time, so the line invited someone to "fix" it by publishing the live key to every visitor. `GROQ_API_KEY`/`HF_API_KEY` are now read only in server modules (`src/lib/ai/*`, `src/app/api/ai/insights`).
- Compare-page fetch URLs use `encodeURIComponent`, and `pickTop` honours `?country=` only when it is a real ISO3 code.
- **Secrets**: `.env*` is gitignored and `.env.example` ships empty placeholders. A real `gsk_…` key briefly pasted into `.env.example` was reverted and never committed (`git log -S gsk_` → no commits on any ref) — **rotate it anyway** if it was ever shared. `shadcn` (a CLI) moved from `dependencies` to `devDependencies`.

Verified after the change: `tsc` clean, `eslint` clean on every touched file, **98 vitest tests / 12 files**, **25 e2e** with `consoleErrors=0` (so the CSP breaks nothing), `?limit=abc` → `400`, and the 16th chat request in a minute → `429`.

### AI model resolution (`src/lib/ai/client.ts`)
The AI features broke because the client hardcoded `llama-3.3-70b-versatile`; Groq returned **404** (that model is not served on the key) and `chat()` did `if (!res.ok) return null`, so the route blamed a *missing key* for a *dead model*. Fixed by resolving the model at runtime:
- `GROQ_MODEL` (optional override) → first of `PREFERRED_MODELS` the key serves → first non-excluded served model → `FALLBACK_MODEL`. Sourced from `GET /openai/v1/models`, cached 10 min, in-flight de-duplicated, `active: false` entries filtered (Groq lists decommissioned models), and audio/guard/`gpt-oss` models excluded (`gpt-oss` returns `content: ""` because reasoning eats the token budget — indistinguishable from failure).
- Every call is bounded by `AbortSignal.timeout`. A 404 clears the cache and retries once with auto-resolution, so a mid-window decommission **or** a typo'd `GROQ_MODEL` self-heals.
- `chatDetailed()` returns a discriminated result with a real `reason` (`missing-key` / `unauthorized` / `model-unavailable` / `rate-limited` / `bad-request` / `empty-response` / `upstream-error`) plus `chatFailureMessage(reason)` for the UI. Both routes log the reason (`JSON.stringify`, key never included) and return the truthful message. `country-insight.tsx` and `comparison-tool.tsx` must **trust the server's message** rather than inferring the cause from the status code — that inference is what mislabelled the 404 as a missing key.
- Tests: `src/lib/ai/client.test.ts` (26) cover every reason, model resolution, the `active`/exclusion filters, cache reuse + 404 self-heal, timeouts, and that the key can never appear in a result. `src/app/api/ai/insights/route.test.ts` pins the `reason → status` mapping (429 rate-limited, 502 upstream/bad-request, 503 otherwise).

## Remaining
- Rate-limit buckets are in-memory (per instance, reset on deploy) — move them to Vercel KV/Upstash before treating the limit as a real quota.
- `xlsx@^0.18.5` is deprecated on npm and below the fixes for CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS). It is ingest-only and never shipped to the browser, but `npm run ingest*` parses remote CSVs with it — migrate to SheetJS' own tarball (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) or swap in `exceljs`.
- `drizzle-orm` + `drizzle-kit` are installed but have **zero imports** anywhere in `src/` or `scripts/` — safe to `npm uninstall` if no migration is planned (the DB layer is the hand-rolled `src/lib/db/client.ts`).
- Playwright has no `webServer` block, so the dev server must be started by hand on **:3456** before `npx playwright test`; wiring `webServer` (or adding a CI job) would remove that manual step.
- `npm run lint` still exits non-zero outside the compare page: 20 errors / 24 warnings, mostly pre-existing (`no-explicit-any` in `src/lib/db/client.ts`, `world-map-card.tsx`, `src/app/api/ai/chat/route.ts`, `src/lib/data/sources/sdg.ts`; unused vars + `no-require-imports` in `scripts/`; one remaining `set-state-in-effect` in `indicator-trend-dialog.tsx`, one `react-hooks/immutability` in `world-map-card.tsx`).
- 6 indicators at 0 pts in the local SQLite DB: `broadband_speed` (Ookla needs heavy tile processing), `ccpi` (Germanwatch, PDF-only), `digital_competitiveness` (IMD, paid), `qs_rank` and `startup_ecosystem` (no open CSV/API), and `epi` (Yale EPI — fetcher exists in `indices.ts` but returns nothing; needs debugging). The other previously-zero indicators (`air_quality`, `patents_per_million`, `trademark_applications`, `ai_readiness`, `disaster_risk`, `global_peace`, `innovation_idx`, `network_readiness`, `social_progress_idx`) now have data locally. Explore keeps all 123 visible with a "No data yet" badge on the 6 (zero-data cards hide the dead "Compare countries →" link).
