<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# India Dashboard — Setup & Tasks

## Required Environment Variables (.env)
```
DATABASE_PATH=./data/india.db
GROQ_API_KEY=          # For AI chatbot answers (get from console.groq.com)
```

## Data Pipeline
1. `npm run ingest` — Fetch all indicator data from WB, UNDP, WHO, OWID, WGI, TI, Numbeo
2. `npm run index-embeddings` — Build local TF-IDF search index (no API key needed)

## PostgreSQL Migration
The DB client auto-detects PG vs SQLite based on `DATABASE_URL` env var:
- **Local**: No DATABASE_URL set → uses `node:sqlite` (sync-backed async API)
- **Vercel/Supabase**: Set `DATABASE_URL` in Vercel env → uses `pg` with `?`→`$N` placeholder rewriting

To seed PG from scratch:
1. Set `DATABASE_URL` in `.env` pointing to Supabase PG (use `.env.local` or remove before commit)
2. Run `npm run ingest` — creates schema + inserts all data directly into PG
3. Run `npm run index-embeddings` — builds TF-IDF index in PG
4. Remove `DATABASE_URL` from `.env` (it stays in Vercel env vars)

⚠️ Do NOT commit `DATABASE_URL` to git (it's in `.gitignore` as `.env.local`)

## Vercel Deploy
`vercel --prod` with `DATABASE_URL` + `GROQ_API_KEY` set in Vercel project dashboard.

## Completed
- PostgreSQL migration: client.ts auto-detects PG/SQLite, all DB calls async, `pg` package installed
- Home page: KPI cards with trend arrows, 4 multi-country trend charts, world map with category-grouped indicator selector, dynamic years
- Explore page: category filter + search with data coverage stats (sorted: data-rich first)
- Compare page: multi-country line/bar/radar charts, delta highlights, data table, AI insight panel
- World map: interactive D3 Mercator choropleth with year selector + historical event annotations
- AI Chat: RAG chatbot with TF-IDF vector search + Groq LLM with citations
- Report Card: per-category scoring, ranks, trends, Print/Save PDF + CSV Export
- ~99 working indicators, ~103,394 data points, 34 ready sources
- `education_idx` computed from UNDP eys+mys in `src/lib/data/sources/undp.ts`
- `egov_idx` from World Bank Data360 EGDI CSV (`src/lib/data/sources/un-egov.ts`)
- `sdg_score` from SDSN SDR xlsx repos (`src/lib/data/sources/sdg.ts`)
- `refugee_population` from OWID grapher (extra.ts) instead of deleted WB code
- `multidim_poverty` from OWID grapher MPI dataset (extra.ts)
- `democracy_idx`, `rule_of_law` from OWID grapher via extra.ts
- `xlsx` npm package installed for parsing xlsx data sources
- `NODE_OPTIONS=--no-warnings` in build/ingest/index-embeddings scripts (set CMD syntax on Windows)

## Remaining
- 20 indicators still at 0 pts — no publicly accessible CSV/API sources found (epi, ccpi, global_peace, social_progress_idx, air_quality, innovation_idx, patents_per_million, qs_rank, broadband_speed, ict_development, digital_competitiveness, govtech_maturity, network_readiness, startup_ecosystem, ai_readiness, open_data, trademark_applications, eparticipation, disaster_risk, global_competitiveness)
- Explore page: supports `?category=` query param for deep-linking from category headers
