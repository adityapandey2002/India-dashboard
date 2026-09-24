<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# India Dashboard — Setup & Tasks

## Required Environment Variables (.env)
```
DATABASE_PATH=./data/india.db
GROQ_API_KEY=          # For AI chatbot answers (get from console.groq.com)
HF_API_KEY=            # Optional — HuggingFace token for RAG embeddings (chat works without it)
# DATABASE_URL=        # OPTIONAL — set to a LIVE Supabase PG connection string to run against Postgres
```
⚠️ `.env` no longer contains `DATABASE_URL` — it was removed because the old Supabase host is dead (see "Known issues / deployment status" below). The dev server, `npm run ingest`, `npm run index-embeddings` and `npm run status` all read `.env`, so the **working local DB is SQLite** at `data/india.db` (217 countries, 120 indicators, 100 with data, ~105,740 data points). A `.env.local` written by the Vercel CLI also exists, but its `DATABASE_URL` line is a masked Vercel placeholder (`echo "…"`), so it does not flip the driver. `.env*` is gitignored.

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
- **Local DB state** — `npm run status` on the live SQLite DB: 217 countries, 120 indicators (100 with data, 20 at 0 pts), 105,740 data points, 34 sources, TF-IDF 50,000 chunks. Several indicators listed as completed below (e.g. `air_quality`, `patents_per_million`, `trademark_applications`, the composite indices from `indices.ts`) currently show 0 pts locally — likely never re-ingested after the PG cut-over; re-run `npm run ingest` / `npm run ingest:new` to refresh.
- **Tests** — 41 passing across 6 files; latest commit `1b29d85` ("Fix server render: remove dead Supabase URL, DRY fmtValue, add format tests, fix trend icon direction") is on `origin/master`.

## Completed
- PostgreSQL migration: client.ts auto-detects PG/SQLite, all DB calls async, `pg` package installed, `bulkInsert` helper
- Home page: KPI cards with trend arrows, 4 multi-country trend charts, world map with category-grouped indicator selector, dynamic years, scatter correlation chart (`/api/scatter` + `ScatterCard`: pick any two indicators, India highlighted, Pearson r + India percentile chips)
- Responsive nav: `src/components/site-nav.tsx` (`SiteNav` client component, desktop `md:flex` links + mobile Menu/X toggle dropdown) wired into `src/app/layout.tsx`
- Test setup: Vitest 4 + Testing Library (jsdom), `npm test`, config `vitest.config.ts` (`@`→`src` alias, setup `src/test/setup.ts`), 16 passing tests at the time (now 41 across 6 files — see Known issues) across `/api/scatter` route (mocked DB) + `scatter-chart` component (mocked fetch + recharts ResponsiveContainer)
- Explore page: category filter + search with data coverage stats (sorted: data-rich first), `?category=` query param
- Compare page: multi-country line/bar/radar charts, delta highlights, data table, AI insight panel
- Country page: overall global score + grade, category radar vs India (`CountryRadar`), top/bottom performer cards, interactive trend vs India (`CountryTrendCard` via `/api/indicators/series`), category score chips. Uses `getLatestRanks` + `getCountryHistory` (6 round-trips instead of ~220)
- World map: interactive D3 Mercator choropleth with year selector + historical event annotations
- AI Chat: RAG chatbot with TF-IDF vector search + Groq LLM with citations
- Report Card: per-category scoring, ranks, trends, Print/Save PDF + CSV Export. Now: overall A–F grade + score (0–100 percentile-based, `src/lib/report-card.ts` helpers), per-category grade badges + score bars, India vs China radar (`ReportCardRadar`), strongest/weakest callouts, top-5 indicators per category by score. Batching via `getLatestRanks(indicatorIds, iso3s)` in `queries.ts` (one round-trip computes each country's own-latest-year rank per indicator instead of ~110 per-indicator queries)
- ~110 working indicators, ~116k data points, 34 ready sources
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

## Remaining
- 20 indicators now at 0 pts in the local SQLite DB (was 10). Of these, 10 have no usable source found (ccpi = PDF-only per Germanwatch; global_competitiveness = WEF discontinued; digital_competitiveness = IMD paid; ict_development = ITU xlsx lacks an India row; broadband_speed = Ookla needs heavy tile processing; qs_rank, startup_ecosystem, govtech_maturity, open_data, eparticipation = no open CSV/API). The other 10 — `air_quality`, `patents_per_million`, `trademark_applications`, `ai_readiness`, `disaster_risk`, `epi`, `global_peace`, `innovation_idx`, `network_readiness`, `social_progress_idx` — do have fetchers built (see Completed) but show 0 pts locally; re-run `npm run ingest` / `npm run ingest:new` to refresh the SQLite DB.
