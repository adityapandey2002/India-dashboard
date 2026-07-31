<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# India Dashboard — Setup & Tasks

## Required Environment Variables (.env)
```
DATABASE_PATH=./data/india.db
GROQ_API_KEY=          # For AI chatbot answers (get from console.groq.com)
DATABASE_URL=          # OPTIONAL — set to Supabase PG to run everything against Postgres
```
⚠️ `.env` currently contains `DATABASE_URL` pointing at the working Supabase PG. The dev server, `npm run ingest`, `npm run index-embeddings` and `npm run status` all read it, so the **working DB is Supabase PG**, not the local SQLite. `data/india.db` is a stale leftover. `.env*` is gitignored.

## Data Pipeline
1. `npm run ingest` — Fetch all indicator data from WB, UNDP, WHO, OWID, WGI, TI, Numbeo
2. `npm run ingest:new` — Fast path: only the newest sources (trademark WB, patents/air_quality OWID grapher, 7 composite indices)
3. `npm run index-embeddings` — Build local TF-IDF search index (no API key needed)
4. `npm run status` — Prints data coverage + zero-point indicators (loads dotenv, so reflects the working DB)

## PostgreSQL Migration
The DB client auto-detects PG vs SQLite based on `DATABASE_URL` env var:
- **Local**: No DATABASE_URL set → uses `node:sqlite` (sync-backed async API)
- **Vercel/Supabase**: Set `DATABASE_URL` in env → uses `pg` with `?`→`$N` placeholder rewriting

`bulkInsert(table, columns, rows, onConflict?)` in `src/lib/db/client.ts` batches multi-row INSERTs — ALWAYS use it for bulk writes to remote PG (per-row `execute` loops are ~100x slower).

To seed PG from scratch:
1. Set `DATABASE_URL` in `.env` pointing to Supabase PG (use `.env.local` or remove before commit)
2. Run `npm run ingest` — creates schema + inserts all data directly into PG
3. Run `npm run index-embeddings` — builds TF-IDF index in PG
4. Remove `DATABASE_URL` from `.env` (it stays in Vercel env vars)

⚠️ Do NOT commit `DATABASE_URL` to git (it's in `.gitignore` as `.env*`)

## Vercel Deploy
`vercel --prod` with `DATABASE_URL` + `GROQ_API_KEY` set in Vercel project dashboard.

## Completed
- PostgreSQL migration: client.ts auto-detects PG/SQLite, all DB calls async, `pg` package installed, `bulkInsert` helper
- Home page: KPI cards with trend arrows, 4 multi-country trend charts, world map with category-grouped indicator selector, dynamic years, scatter correlation chart (`/api/scatter` + `ScatterCard`: pick any two indicators, India highlighted, Pearson r + India percentile chips)
- Responsive nav: `src/components/site-nav.tsx` (`SiteNav` client component, desktop `md:flex` links + mobile Menu/X toggle dropdown) wired into `src/app/layout.tsx`
- Test setup: Vitest 4 + Testing Library (jsdom), `npm test`, config `vitest.config.ts` (`@`→`src` alias, setup `src/test/setup.ts`), 16 passing tests across `/api/scatter` route (mocked DB) + `scatter-chart` component (mocked fetch + recharts ResponsiveContainer)
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

## Remaining
- 10 indicators still at 0 pts — no usable source found (ccpi = PDF-only per Germanwatch; global_competitiveness = WEF discontinued; digital_competitiveness = IMD paid; ict_development = ITU xlsx lacks an India row; broadband_speed = Ookla needs heavy tile processing; qs_rank, startup_ecosystem, govtech_maturity, open_data, eparticipation = no open CSV/API)
