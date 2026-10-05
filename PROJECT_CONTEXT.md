# PROJECT_CONTEXT.md

> Source-of-truth material for writing the full project documentation.
> Everything below was verified by reading the code, configs, and the live
> `data/india.db` on 2026-10-04. Numbers marked **(live DB)** were queried directly.
> Anything not found in code is written as `TBD / Not found in codebase`.

**Repo root:** `India-dashboard/`
**Generated:** 2026-10-04

---

## 1. Project Overview

| Field | Value |
|---|---|
| Package name | `india-dashboard` (`package.json`) |
| Version | `0.1.0`, `private: true` (not published) |
| Product title | "India in the World — Global Progress Dashboard" |
| Meta title | "India in the World — Global Progress Dashboard" (`src/app/layout.tsx`) |
| Stated purpose | "Built for the **Development Challenge 2026**" (`README.md`) |

**One-paragraph description.**
India Dashboard is a read-only, data-visualisation web application that tracks how India
ranks against every other country in the world across a large registry of international
development indicators. It ingests public datasets (World Bank, UNDP, WHO, OWID, WGI,
Transparency International, Numbeo, and 25+ others) into a relational store, normalises
everything into a single long-format `data_points` table, and serves server-rendered pages
that rank, score, grade, chart, compare, and explain those indicators. It also ships a
retrieval-augmented AI chat that answers questions about the dataset with inline citations.

**Problem it solves.**
Global development data is fragmented across dozens of publishers, each with its own
units, scales, definitions, update cadence, and country-name conventions. A citizen,
journalist, student, or policy analyst who wants to answer "how is India doing compared to
the rest of the world on X?" has to visit a dozen sites, reconcile definitions, and do the
ranking arithmetic by hand. This project does that once, centrally, and presents it in a
single navigable site with a transparent, documented scoring methodology.

**Target users.**
Not stated as personas anywhere in the codebase — `TBD / Not found in codebase`.
Inferred from shipped features (analyst-facing ranking tables, methodology page, CSV export,
print-to-PDF report card, citation-backed AI chat): journalists, policy analysts, students,
researchers, and data-literate general readers.

**Core value proposition.**
- **One place, 100+ indicators, 217 countries** instead of a dozen silos.
- **Honest normalisation** — every number is percentile-ranked against the actual global
  distribution, so a low raw value can still score well, and the methodology page documents
  this explicitly.
- **Direction-aware** — the app knows that for 37 indicators (mortality, pollution, Gini,
  corruption, …) a *lower* number is better, and flips trend arrows, ranks, and "better vs
  worse" labelling everywhere.
- **Explainability** — every indicator page carries a plain-language explanation, the
  calculation method, links to the original source, and Indian historical events annotated
  with proof URLs so the user can verify every claim.
- **Zero-cost to run locally** — SQLite via Node's built-in `node:sqlite`, free-tier AI.

---

## 2. Features

Status legend: **Implemented** / **Partially implemented** / **Planned**

### 2.1 Data ingestion & pipeline (offline, operator-run)

| # | Feature | Status | Where |
|---|---|---|---|
| 1 | Full ingestion of 33 sources → 217 countries | **Implemented** | `scripts/ingest.ts` (`npm run ingest`) |
| 2 | Idempotent UPSERT on `(country_iso3, indicator_id, year)` | **Implemented** | `scripts/ingest.ts` → `insertPoints()` |
| 3 | Bounded-concurrency worker pool (`CONCURRENCY = 5`) | **Implemented** | `scripts/ingest.ts` → `pool()` |
| 4 | 24-hour staleness skip per indicator (`STALE_HOURS = 24`) | **Implemented** | `scripts/ingest.ts` → `isFresh()` |
| 5 | Data-coverage / zero-point reporting | **Implemented** | `scripts/status.ts` (`npm run status`) |
| 6 | TF-IDF search index build (50,000 chunks) | **Implemented** | `scripts/index-embeddings.ts` |
| 7 | Fast targeted ingest for newly added sources | **Implemented** | `scripts/ingest-new.ts` (`npm run ingest:new`) |
| 8 | SQLite → PostgreSQL data migration | **Broken** | `npm run migrate-pg` points at `scripts/migrate-to-pg.ts`; the file on disk is `scripts/migrate-to-pg.mjs` → command fails |
| 9 | HuggingFace dense embeddings | **Partially implemented** — code exists, never invoked | `src/lib/ai/embeddings.ts` (`getEmbedding`, `getEmbeddings`) has 0 call sites; `HF_API_KEY` is effectively unused |
| 10 | Scheduled/automated ingestion (cron, CI) | **TBD / Not found in codebase** | no workflow files, no cron config |

### 2.2 Public pages

| # | Route | Feature | Status |
|---|---|---|---|
| 11 | `/` | 12 KPI cards with year-over-year trend arrows + click-through year-wise trend dialog | **Implemented** |
| 12 | `/` | Interactive D3 Mercator world choropleth with indicator + year + continent selectors, hover tooltips, country labels | **Implemented** |
| 13 | `/` | Scatter correlation chart — any 2 indicators, Pearson r, India highlighted | **Implemented** |
| 14 | `/` | 4 multi-country trend charts (GDP, life expectancy, HDI, CO₂ per capita) | **Implemented** |
| 15 | `/` | Top-12 global GDP leaderboard + India's rank card | **Implemented** |
| 16 | `/explore` | All 123 indicators, category filter tabs, free-text search, coverage stats (data points, countries, year range), sorted data-rich first | **Implemented** |
| 17 | `/indicator/[id]` | Per-indicator page: India latest value, global rank, trend, top-10 leaderboard, "in simple words", "how it is calculated", historical events with proof URLs, learn-more links, related indicators | **Implemented** (see §16 for 1 copy-paste artefact + 1 misleading card) |
| 18 | `/indicator/[id]` | Plain-language guide for every indicator | **Partially implemented** — `src/lib/indicator-guides.ts` has ~68 hand-written guides against a 123-indicator registry; remainder falls back to a generic template |
| 19 | `/country/[iso3]` | Country profile: overall 0–100 score + A–F grade, category radar vs India, top-3/bottom-3 performers, interactive trend-vs-India, per-category panels with sparklines and ranks | **Implemented** |
| 20 | `/compare` | Up to 20 countries side-by-side: line chart, bar chart, radar, data table, delta highlights, AI insight panel | **Implemented** |
| 21 | `/rankings` | Sortable/searchable full-world ranking table for any indicator, India row highlighted with "You" badge, India rank/percentile/rank-delta cards, India rank-over-time chart | **Implemented** |
| 22 | `/report-card` | India report card: overall A–F grade + score, per-category grade badges and score bars, India-vs-China radar, strongest/weakest callouts, top-5 indicators per category in collapsible accordions | **Implemented** |
| 23 | `/report-card` | Print / Save-as-PDF and CSV export | **Implemented** — `src/components/dashboard/export-buttons.tsx` |
| 24 | `/methodology` | Sources, "how indicators are calculated" 6-step pipeline, "how to read the charts", caveats | **Implemented** |
| 25 | `/chat` | RAG chatbot with citation chips, suggestion prompts, conversation history | **Implemented** |
| 26 | — | Dark/light theme toggle UI | **Partially implemented** — `next-themes` installed (1 ref), Tailwind `.dark` custom-variant and dark: classes present throughout, but **no theme toggle component and no `ThemeProvider` in `src/app/layout.tsx`** |
| 27 | — | Toast notifications | **Partially implemented** — `src/components/ui/sonner.tsx` exists but is not mounted anywhere |
| 28 | — | Auth / user accounts / saved views / watchlists | **Planned** — README marks "⏳ next"; no auth code anywhere |
| 29 | — | Mobile app / export to other formats (PDF/JSON beyond CSV) | **TBD / Not found in codebase** |

### 2.3 Main user flows

**Flow A — "How is India doing?" (home)**
1. Land on `/` → header shows live totals (data points, indicators-with-data %, country count, year span).
2. Read 12 KPI cards; each shows latest value, source year, and a green/red arrow with % change vs the previous year. Clicking a card opens `IndicatorTrendDialog` → fetches `/api/indicators/series?country=IND&indicator=…` → renders a full-history line chart.
3. Scan the world map → pick indicator + year + continent → client fetches `/api/indicators/leaderboard?indicator=…&limit=250&year=…` → choropleth recolours → hover a country for its value.
4. Use the scatter plot → pick X and Y indicators → client fetches `/api/scatter?x=…&y=…` → every country plotted, India highlighted, Pearson r + percentile chips shown.
5. Read the 4 trend charts and the GDP leaderboard.

**Flow B — "Find and understand one indicator"**
1. `/explore` → click a category tab (or land with `?category=economy`) → optionally type in "Search indicators…".
2. Click an indicator card → `/indicator/[id]`.
3. Read India latest / global rank / recent trend / top-10 table.
4. Read "In simple words" + "How is it calculated?" + "What moved this number — with sources" (historical events, each with an external proof link).
5. Follow "Open in Compare →" or a "Learn more" link.

**Flow C — "Compare countries"**
1. `/compare` (supports `?country=ISO3` and `?indicator=id` deep links from the country and indicator pages).
2. Client auto-picks the top-N countries for the chosen indicator via `/api/indicators/leaderboard`, always forcing `IND` into the selection.
3. Toggle countries via `FlowChips`, search the 217-country row, change count (3/5/8/10/15/20).
4. For each selected country, client fires `/api/indicators/series` (parallel) → line + bar + radar + table render.
5. Click "AI insight" → POST `/api/ai/chat` with a templated question → Groq answers with citations.

**Flow D — "Where does India rank?"**
1. `/rankings?indicator=<id>` → `RankingsClient` fetches `/api/rankings?indicator=…`.
2. Server returns the full ranking + India's row + India's rank history + ISO→name map.
3. Sort by any column, search countries, watch India's rank-over-time chart (inverted Y so rank 1 is at the top).

**Flow E — "Grade India" (report card)**
1. `/report-card` → server computes ranks for `IND` and `CHN` in one batched query.
2. Overall percentile score → A–F grade; per-category scores → badges + bars; radar compares India vs China.
3. Expand a category accordion to see its top-5 indicators with rank, value, trend.
4. Export: `window.print()` (Save as PDF) or download `india-report-card-<year>.csv`.

**Flow F — "Ask AI"**
1. `/chat` → type a question (or click one of 4 suggestions) → POST `/api/ai/chat` with `{question, conversationHistory}`.
2. Server tries local TF-IDF `vectorSearch()`; falls back to keyword `buildContext()`; always appends matching historical events.
3. Groq (`llama-3.3-70b-versatile`, temp 0.2, 1500 max tokens) answers using only the supplied context.
4. Client extracts `[chunk_id]` markers server-side into a `citations[]` array → rendered as a collapsible "N sources" list with `open` links for event sources.

---

## 3. Tech Stack

All versions below are from `package.json` (caret ranges as written).

### 3.1 Languages & core framework

| Tech | Version | Why |
|---|---|---|
| TypeScript | `^5` | Strict mode (`tsconfig.json`: `"strict": true`, `noEmit`). All DB rows are typed and mapped to camelCase DTOs in `src/lib/db/types.ts`, so raw DB objects never reach the UI. |
| Next.js | `16.2.11` (App Router) | Full-stack React. React Server Components let pages fetch on the server and ship only the shape the client needs → fast first paint and indexable HTML. README: "server components = fast + SEO-friendly". |
| React / React DOM | `19.2.4` | Matches Next 16 requirement. |
| Node.js | `^20` types, **Node 22+ required at runtime** | `node:sqlite` (`DatabaseSync`) is used for local dev; `src/lib/db/client.ts` header states "Node 22+". Emits an `ExperimentalWarning` on every DB call (suppressed in npm scripts via `NODE_OPTIONS=--no-warnings`). |

### 3.2 Styling & UI

| Tech | Version | Why / where used |
|---|---|---|
| Tailwind CSS | `^4` + `@tailwindcss/postcss` | Utility styling. v4 CSS-first config: `src/app/globals.css` uses `@import "tailwindcss"` + `@theme inline` with OKLCH tokens and a `@custom-variant dark`. |
| shadcn | `^4.14.0` | Copy-paste component distribution (no runtime component library lock-in). `components.json` at root. |
| `@base-ui/react` | `^1.6.0` | 8 refs — the unstyled primitives shadcn components are built on (`src/components/ui/*`). |
| `tw-animate-css` | `^1.4.0` | Animation utilities imported in `globals.css`. |
| `lucide-react` | `^1.25.0` | Icon set used across every page. |
| `class-variance-authority`, `clsx`, `tailwind-merge` | `^0.7.1`, `^2.1.1`, `^3.6.0` | Standard shadcn `cn()` helper in `src/lib/utils.ts`. |
| `sonner` | `^2.0.7` | Toast component exists (`ui/sonner.tsx`) but is **not mounted**. |
| `next-themes` | `^0.4.6` | Installed; dark tokens exist but no provider/toggle is wired. |
| `motion` | `^14.0.0` | FLIP layout animation in `src/components/ui/flow-chips.tsx` (`motion/react`, `whileTap`, spring transitions). |

### 3.3 Charts & maps

| Tech | Version | Why / where used |
|---|---|---|
| `recharts` | `^3.10.0` | All standard charts (Line, Bar, Radar) — `trend-chart.tsx`, `scatter-chart.tsx`, `comparison-tool.tsx`, `country-radar.tsx`, `report-card-radar.tsx`, `rankings-client.tsx`. |
| `d3-geo` | `^3.1.1` | `geoMercator()` projection + `fitSize` for the SVG world map. |
| `topojson-client` | `^3.1.0` | `feature()` to convert `public/world-110m.json` into GeoJSON. |
| `world-atlas` | `^2.0.2` | **Installed but 0 source refs** — `public/world-110m.json` is committed instead; this dep is vestigial. |
| `d3-scale` | `^4.0.2` | **Installed but 0 source refs** — colour interpolation in the map is hand-rolled (`pastelColor()` in `world-map-card.tsx`). |

### 3.4 Data & database

| Tech | Version | Why / where used |
|---|---|---|
| `node:sqlite` (`DatabaseSync`) | Node built-in | Local/dev database. README: "zero install, zero compile pain". WAL mode, `foreign_keys=ON`, `synchronous=NORMAL`. |
| `pg` | `^8.22.0` | Production Postgres driver. Activated purely by the presence of `DATABASE_URL` (`isPg()` in `src/lib/db/client.ts`). |
| `drizzle-orm` / `drizzle-kit` | `^0.45.2` / `^0.31.10` | **Installed but 0 source refs.** All SQL is hand-written; there is no `drizzle.config.*` and no schema files. Pure dead weight. |
| `xlsx` | `^0.18.5` | 32 refs — parses upstream `.xlsx` sources (WIPO GII, Portulans NRI, Ease of Doing Business, E-Participation…). |
| `papaparse` | `^5.5.4` | **Installed but 0 source refs** — CSV parsing is done by hand. |
| `adm-zip` | `^0.6.0` + `@types/adm-zip` | 1 ref — unzipping downloaded archives. |
| `dotenv` | `^17.4.2` | `import "dotenv/config"` at the top of all 4 CLI scripts so they read `.env`. |

### 3.5 AI

| Tech | Version | Why / where used |
|---|---|---|
| `groq-sdk` | `^1.4.1` | Used in **one** place: `src/app/api/ai/insights/route.ts`. |
| Groq HTTP API (raw `fetch`) | `https://api.groq.com/openai/v1/chat/completions` | The *primary* path, in `src/lib/ai/client.ts`. Model default `llama-3.3-70b-versatile` (also `mixtral-8x7b-32768`, `gemma2-9b-it` typed). Free tier. |
| HuggingFace Inference API | `sentence-transformers/all-MiniLM-L6-v2` | `src/lib/ai/embeddings.ts` — implemented, never called. |
| Local TF-IDF + cosine similarity | in-house | `src/lib/ai/vector-search.ts` + `scripts/index-embeddings.ts`. This is the *actual* RAG retriever; no external embedding service is required. |

### 3.6 Validation, state, testing

| Tech | Version | Status |
|---|---|---|
| `zod` | `^4.4.3` | **Installed, 0 source refs.** No runtime request validation anywhere — API routes hand-check query params with `if (!x) return 400`. |
| `zustand` | `^5.0.14` | **Installed, 0 source refs.** All client state is plain `useState`. README calls it "ready when we need client state / cache". |
| `vitest` | `^4.1.10` | Unit/component tests. `npm test` → `vitest run`. |
| `@testing-library/react` / `jest-dom` / `user-event` | `^16.3.2` / `^7.0.0` / `^14.6.1` | jsdom component tests. |
| `jsdom` | `^29.1.1` | Vitest environment. |
| `@playwright/test` + `playwright` | `^1.63.0` | E2E in `e2e/`. **Not wired to any npm script.** |
| `eslint` + `eslint-config-next` | `^9` / `16.2.11` | `npm run lint`. Config: `eslint.config.mjs`. |
| `tsx` | `^4.23.1` | Runs the TypeScript CLI scripts. |
| `vercel` | `^59.16.0` | Vercel CLI as a devDependency. |

### 3.7 Hosting / deployment

| Item | Status |
|---|---|
| Hosting | **Vercel** (serverless). `vercel --prod` per `AGENTS.md`. |
| Production DB | **Supabase PostgreSQL**, activated by `DATABASE_URL`. ⚠️ Currently broken — see §16. |
| Local DB | SQLite at `data/india.db`. |
| Domain | `TBD / Not found in codebase` — no domain, no `vercel.json`, no `.vercel/` project config committed. |
| CDN / storage / maps / email / SMS / analytics / payments | **None.** No payment gateway, no auth provider, no email/SMS/WhatsApp integration, no analytics (no GA, Plausible, PostHog, Sentry), no cloud storage, no map tiles provider. Fully static + server-rendered. |

### 3.8 Third-party data sources (33 seeded in the `sources` table)

Grouped as they appear in `scripts/ingest.ts` `SOURCES[]` and `src/app/methodology/page.tsx`.

| Source id | Name | Type | Indicators |
|---|---|---|---|
| `world_bank` | World Bank Open Data | api | The backbone — ~45 indicators (GDP, poverty, health, education, trade, infrastructure) |
| `undp` | UNDP Human Development Reports | api | HDI, IHDI, GDI, GII, MPI, EYS, MYS, GNIPC, POP, education index |
| `who` | World Health Organization GHO | api | UHC service coverage, road traffic deaths |
| `wgi` | Worldwide Governance Indicators | api | GE.EST, PV.EST, RQ.EST, VA.EST, CC.EST |
| `ti` | Transparency International CPI | api | corruption_idx |
| `un` | UN E-Government Survey | api | egov_idx (World Bank Data360 EGDI CSV), eparticipation |
| `numbeo` | Numbeo | api | healthcare/safety/crime/quality-of-life/cost-of-living indices |
| `vdem` | V-Dem Institute | api | democracy_idx |
| `wipo` | WIPO Global Innovation Index | pdf | innovation_idx (GII xlsx 2022–2024) |
| `oxford` | Oxford Insights AI Readiness | pdf | ai_readiness |
| `turtle` | Portulans Institute | pdf | network_readiness (NRI 2024 xlsx) |
| `yale` | Yale EPI | pdf | epi (2026) |
| `iep` | Institute for Economics & Peace | pdf | global_peace (GPI 2008–2024) |
| `inform` | INFORM Risk Index (HDX) | api | disaster_risk |
| `sspi` | Social Progress Imperative | pdf | social_progress_idx |
| `sdg` | SDG Transformation Center (SDSN) | pdf | sdg_score (xlsx repos) |
| `doing_business` | World Bank Doing Business (archived) | pdf | ease_of_doing_business (India 2014–2020) |
| `wef` | World Economic Forum | api | global_competitiveness, gender_gap, happiness |
| `ei` | Economist Intelligence Unit | api | (registered; `quality_of_life` now comes from Numbeo) |
| `ihme` | IHME Global Health Data | api | haq_idx |
| `oecd` | OECD PISA | api | pisa_score |
| `rsf` | Reporters Without Borders | api | press_freedom |
| `heritage` | Heritage Foundation | api | economic_freedom |
| `gtd` | Global Terrorism Database | api | terrorism_idx |
| `ibp` | International Budget Partnership | api | open_budget |
| `germanwatch` | Germanwatch CCPI | pdf | ccpi |
| `imd` | IMD World Competitiveness | pdf | digital_competitiveness |
| `iqair` | IQAir | api | air_quality (PM2.5) |
| `startupblink` | StartupBlink | api | startup_ecosystem |
| `ookla` | Ookla Speedtest | api | broadband_speed |
| `qs` | QS World University Rankings | pdf | qs_rank |
| `od` | Open Data Watch | pdf | open_data |
| `itu` | ITU ICT Development | api | ict_development |
| `wjp` | World Justice Project | pdf | rule_of_law |

**Sources actually consumed as OWID mirrors** (`src/lib/data/sources/owid.ts`, `owid-generic.ts`, `extra.ts`): Our World in Data grapher CSVs for CO₂ per capita, fossil-fuel share, refugee population, multidimensional poverty, patents per million, air quality, and the 10 datasets above tagged `wef`/`ei`/`ihme`/`oecd`/`rsf`/`heritage`/`iep`/`gtd`/`ibp`/`inform`.
⚠️ **`owid` has no row in the `sources` table** even though 3 registered indicators declare `source: "owid"` (`co2_per_capita`, `fossil_fuel_energy`, `patents_per_million`) — the `SOURCES[]` seed array in `scripts/ingest.ts` omits it.

---

## 4. Architecture

### 4.1 High-level shape

A **single Next.js App Router application** with no separate backend service, no ORM, and no
external cache. Data is read directly from the database by React Server Components; the only
HTTP endpoints are thin JSON read APIs consumed by interactive client components, plus two
AI endpoints.

Layering is strict and enforced by convention:

```
CLI scripts (ingest / index / status / migrate)   ← the only writers
        │
        ▼
src/lib/data/sources/*.ts   ← per-source fetchers, return a flat DataPoint[]
        │
        ▼
src/lib/db/client.ts        ← driver-agnostic query() / execute() / bulkInsert()
        │                    + inline schema migrations for BOTH engines
        ▼
src/lib/db/queries.ts       ← the ONLY place app code touches domain SQL
        │
        ├──────────────► src/app/**/page.tsx        (React Server Components)
        │                       │
        │                       ├─► renders directly (no API hop)
        │                       └─► passes props to client islands
        │
        └──────────────► src/app/api/**/route.ts   (JSON endpoints)
                                │
src/app/**/*.tsx ("use client") components
        │
        └─► fetch("/api/…") on interaction only
```

### 4.2 How components communicate

| Path | Mechanism |
|---|---|
| Page → data | **Direct in-process function call.** Server pages `await getLatestSnapshot("IND")` etc. No HTTP, no fetch. |
| Page → client island | Serialised React props. Several pages explicitly `JSON.parse(JSON.stringify(rows))` before crossing the server/client boundary (e.g. `src/app/compare/page.tsx`, `src/app/explore/page.tsx`). |
| Client island → data | `fetch()` to `/api/*` in `useEffect`, with a `cancelled` flag guard against setting state after unmount. |
| API route → data | Same `src/lib/db/queries.ts` functions the pages use. |
| Chat UI → AI | `POST /api/ai/chat` → TF-IDF retrieval (or keyword fallback) → Groq. |
| Trend arrows / grades | Pure functions in `src/lib/{rank-direction,report-card,rankings,format}.ts` — no DB, fully unit-tested. |

### 4.3 Database driver auto-detection

`src/lib/db/client.ts` is the crux of the deployment story:

```ts
const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "india.db");
function isPg(): boolean { return !!process.env.DATABASE_URL; }
function pgSql(sql: string) { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); }
```

- **No `DATABASE_URL`** → `node:sqlite` `DatabaseSync`, opened once and memoised in `_sqLite`,
  `mkdir -p` on the DB directory, `PRAGMA journal_mode=WAL`, `foreign_keys=ON`, `synchronous=NORMAL`,
  then `runSqliteMigrations(db)`.
- **`DATABASE_URL` set** → lazy `import("pg")`, `new Pool({connectionString})`, then `runPgMigrations()`.
- Both expose the same async `query<T>(sql, params) → Promise<T[]>`, `execute()`, `bulkInsert()`,
  and `closeDb()`. Placeholders are written as `?` everywhere and rewritten to `$N` for PG.

### 4.4 Mermaid — system architecture

```mermaid
flowchart TB
  subgraph SRC["Public data sources (33)"]
    WB["World Bank API v2"]
    UNDP["UNDP HDR CSV"]
    WHO["WHO GHO"]
    OWID["OWID grapher CSV"]
    WGI["WGI CSV"]
    PDF["XLSX / PDF / zip sources<br/>WIPO, Yale, IEP, INFORM,<br/>Oxford, Portulans, SDSN,<br/>WB Doing Business, Germanwatch…"]
    SCR["HTML scrape<br/>Numbeo"]
  end

  subgraph PIPE["CLI pipeline — tsx, Node"]
    ING["scripts/ingest.ts<br/>pool(CONCURRENCY=5)<br/>isFresh(24h)<br/>upsert"]
    NEW["scripts/ingest-new.ts<br/>targeted re-ingest"]
    IDX["scripts/index-embeddings.ts<br/>TF-IDF, top-50 terms<br/>MAX 50k chunks"]
    STA["scripts/status.ts<br/>coverage report"]
  end

  DB[("DATABASE<br/>no DATABASE_URL → node:sqlite<br/>data/india.db<br/>—<br/>DATABASE_URL set → pg Pool<br/>Supabase Postgres")]

  subgraph APP["Next.js 16 App Router (Vercel)"]
    Q["src/lib/db/queries.ts<br/>single source of truth"]
    RSC["React Server Components<br/>src/app/**/page.tsx"]
    API["Route Handlers<br/>src/app/api/**/route.ts"]
    ISL["Client islands<br/>components/**/*.tsx"]
  end

  subgraph AI["AI layer"]
    VS["src/lib/ai/vector-search.ts<br/>TF-IDF + cosine"]
    GROQ["Groq chat API<br/>llama-3.3-70b-versatile"]
    HF["HuggingFace embeddings<br/>(implemented, unused)"]
  end

  USER["Browser"]

  WB & UNDP & WHO & OWID & WGI & PDF & SCR --> ING
  ING --> DB
  NEW --> DB
  IDX --> DB
  STA --> DB
  DB <--> Q
  Q --> RSC
  Q --> API
  RSC -.props.-> ISL
  ISL -- "fetch /api/* on interaction" --> API
  USER --> RSC
  USER -- "fetch /api/*" --> API
  API --> VS
  VS --> DB
  API --> GROQ
  API -.-> HF
  RSC --> GROQ

  classDef db fill:#e8d5b9,stroke:#8a6d3b
  classDef ext fill:#d9e8d5,stroke:#3b8a4a
  class DB db
  class WB,UNDP,WHO,OWID,WGI,PDF,SCR,GROQ,HF ext
```

### 4.5 Mermaid — request / data flow (single page render)

```mermaid
sequenceDiagram
  autonumber
  participant U as Browser
  participant P as Server Component<br/>(page.tsx)
  participant Q as lib/db/queries.ts
  participant C as lib/db/client.ts
  participant D as SQLite / Postgres

  U->>P: GET /country/IND
  P->>Q: getAllCountries() + getAllIndicators()
  Q->>C: query("SELECT …")
  C->>D: params with ? → $N rewrite (PG only)
  D-->>C: rows[]
  C-->>Q: camelCase DTOs
  Q-->>P: Country[] / Indicator[]
  P->>Q: getLatestSnapshot / getCountryHistory<br/>/ getLatestRanks(allIds,[IND,IND])
  Note over Q,D: getLatestRanks = ONE round-trip<br/>ROW_NUMBER + RANK + COUNT OVER
  D-->>Q: rank, total, year
  P->>P: indicatorScore() → category averages<br/>→ gradeFor() → radar + best/worst
  P-->>U: streamed HTML (charts, sparklines, ranks)
  Note over U,P: zero further requests on first paint

  U->>U: pick an indicator in CountryTrendCard
  U->>Q: GET /api/indicators/series?country=IND&indicator=…
  Q->>C: getIndicatorSeries()
  C->>D: WHERE country_iso3=? AND indicator_id=? ORDER BY year
  D-->>U: JSON { iso3, indicator, data[] }
```

### 4.6 Mermaid — ingestion flow

```mermaid
flowchart LR
  A["npm run ingest"] --> B["getDb() — auto-detect driver"]
  B --> C["seedStatic()"]
  C --> C1["UPSERT sources[] (33)"]
  C --> C2["UPSERT indicators[] (123) from<br/>src/lib/data/indicators.ts"]
  C --> C3["fetchAllCountries() → UPSERT countries (217)<br/>WB aggregates filtered: region.id !== 'NA'"]
  C3 --> D["knownCountries = Set(iso3)"]
  D --> E{"per indicator, pool(5)"}
  E -->|isFresh ≤24h| E1["skip"]
  E --> F["fetchIndicator(sourceId, [], 2010, now)"]
  F --> G["filter to knownCountries, drop nulls"]
  G --> H["bulkInsert('data_points', 500/chunk)"]
  H --> I["ON CONFLICT(country_iso3,indicator_id,year)<br/>DO UPDATE SET value, fetched_at"]
  E --> J["UNDP CSV / WHO / OWID / WGI /<br/>Numbeo / TI / UN-Egov / extra<br/>grapher / SDG / 11 composite indices /<br/>Doing Business"]
  J --> H
  I --> K["summary: fetched / skipped / failed / points"]
```

### 4.7 Mermaid — AI chat (RAG) flow

```mermaid
flowchart TD
  A["POST /api/ai/chat<br/>{question, conversationHistory}"] --> B{"vectorSearch(question, topK=15)"}
  B -->|"embeddings table populated<br/>TF-IDF cosine"| C["top-15 chunks"]
  B -->|"null (no index / no parse)<br/>→ fallback"| D["buildContext(question)"]
  D --> D1["if 'india' → all IND data points"]
  D --> D2["keyword match 15 indicator terms<br/>→ global top-5 + India rank"]
  D --> D3["if trend-word → series for<br/>IND,USA,CHN,BRA,ZAF"]
  D --> D4["country-name regex → latest 15 points"]
  D --> D5["cap at 50 chunks"]
  C --> E["+ eventChunksFor(question)<br/>INDIA_EVENTS keyword match"]
  D5 --> E
  E --> F{"chunks.length === 0?"}
  F -->|yes| G["200 + canned 'no data' answer,<br/>citations: []"]
  F -->|no| H["build prompt:<br/>SYSTEM_PROMPT + history +<br/>'Context:\n[id] text …'"]
  H --> I{"chat() — GROQ_API_KEY set?"}
  I -->|no| J["200 + 'AI unavailable. Set GROQ_API_KEY…'"]
  I -->|yes| K["Groq llama-3.3-70b-versatile<br/>temp 0.2, max_tokens 1500"]
  K --> L["regex \\[([^\\]]+)\\] → citationIds"]
  L --> M["filter contextChunks to cited ids"]
  M --> N["200 {answer, citations[]}"]
```

---

## 5. Folder and File Structure

```
India-dashboard/
├── PROJECT_CONTEXT.md              # ← this file (documentation source material)
│
├── .env                            # local secrets — NOT in git (.env* ignored)
├── .env.example                    # committed template: 4 var NAMES, no values
├── .gitignore                      # ignores .env* (except .env.example), data/*.db*, .next,
│                                   #   .vercel, playwright-report, test-results, *.tsbuildinfo
├── AGENTS.md                       # agent-facing setup notes + known issues + completed/remaining
├── CLAUDE.md                       # (present; contents not verified in this pass — TBD)
├── README.md                       # product-facing overview, run/build instructions, layout
├── components.json                 # shadcn/ui configuration
├── dev-server.log                  # stray dev-server output committed to the tree
├── eslint.config.mjs               # flat ESLint config (eslint-config-next)
├── next-env.d.ts                   # Next.js ambient types (gitignored)
├── next.config.ts                  # Next config — currently EMPTY (no options set)
├── package.json                    # 37 deps + 23 devDeps, 9 npm scripts
├── package-lock.json
├── playwright.config.ts            # E2E config — baseURL :3456, NO webServer block
├── postcss.config.mjs              # Tailwind v4 PostCSS plugin wiring
├── tsconfig.json                   # strict TS, "@/*" → "./src/*", bundler resolution
├── tsconfig.tsbuildinfo            # stale incremental build cache (gitignored)
├── vitest.config.ts                # jsdom + globals + setupFiles + "@" alias
│
├── data/
│   ├── india.db                    # live SQLite DB (gitignored, present locally)
│   └── raw/undp_hdr.csv            # downloaded UNDP HDR source CSV
│
├── e2e/                            # Playwright E2E (2 specs + 3 helpers)
│   ├── flows.spec.ts               # 7 numbered critical-journey tests
│   ├── health.spec.ts              # per-page health sweep + DB sanity
│   └── helpers/
│       ├── db.ts                   # direct SQLite reads to compute expected values
│       ├── health.ts               # console/page-error collectors, overlay+digest detection
│       └── pages.ts                # CRITICAL_PATHS constant
│
├── public/
│   ├── world-110m.json             # TopoJSON world geometry (Natural Earth 110m) for the map
│   ├── favicon.svg                 # referenced by layout metadata
│   └── (next.svg, vercel.svg, globe.svg, file.svg, window.svg)  # CRA/Vercel template leftovers
│
├── scripts/                        # operator-run CLI (tsx), NOT part of the Next build
│   ├── ingest.ts                   # FULL ingestion — all 33 sources, 577 lines
│   ├── ingest-new.ts               # targeted re-ingest of newest sources
│   ├── index-embeddings.ts         # TF-IDF index builder → embeddings table
│   ├── status.ts                   # data-coverage + zero-point report
│   ├── migrate-to-pg.mjs           # ⚠️ .mjs on disk; package.json calls .ts → broken
│   ├── check-remaining.cjs         # ⚠️ ad-hoc debris, not referenced by package.json
│   └── check-remaining.js          # ⚠️ duplicate of the .cjs above
│
└── src/
    ├── app/                        # App Router — 9 pages, 6 route handlers
    │   ├── layout.tsx              # root layout: Geist fonts, metadata, <SiteNav/>, NO ThemeProvider
    │   ├── globals.css             # Tailwind v4 @theme inline, OKLCH tokens, dark variant
    │   ├── page.tsx                # "/" home — force-dynamic, 12 KPIs, map, scatter, 4 charts
    │   ├── chat/
    │   │   ├── page.tsx            # "/chat" server shell
    │   │   └── (client) chat-interface.tsx lives in components/chat
    │   ├── compare/page.tsx        # "/compare" — force-dynamic, passes countries + indicatorsByCategory
    │   ├── country/[iso3]/page.tsx # "/country/:iso3" — profile, radar vs India, best/worst
    │   ├── explore/
    │   │   ├── page.tsx            # "/explore" — reads ?category=, passes coverage to client
    │   │   └── explore-client.tsx  # category tabs + search + grid
    │   ├── indicator/[id]/page.tsx # "/indicator/:id" — full explainer page
    │   ├── methodology/page.tsx    # "/methodology" — force-dynamic, sources + scoring + caveats
    │   ├── rankings/
    │   │   └── page.tsx            # "/rankings" — force-dynamic, ?indicator= prop
    │   ├── report-card/page.tsx    # "/report-card" — force-dynamic, grade + sections + export
    │   └── api/
    │       ├── ai/chat/route.ts            # POST — RAG chat with citations (248 lines)
    │       ├── ai/insights/route.ts        # POST — one-shot country analysis (groq-sdk)
    │       ├── indicators/leaderboard/route.ts  # GET  — top-N + available years
    │       ├── indicators/series/route.ts        # GET  — one country × one indicator series
    │       ├── rankings/route.ts                 # GET  — full ranking + India history
    │       └── scatter/route.ts                  # GET  — 2-indicator scatter + Pearson r
    │
    ├── components/
    │   ├── site-nav.tsx            # sticky nav; 8 links; desktop inline + mobile Menu/X dropdown
    │   ├── chat/chat-interface.tsx # "use client" — message list, suggestions, citations <details>
    │   ├── dashboard/
    │   │   ├── comparison-tool.tsx # "use client" — biggest client component (FlowChips, 4 charts,
    │   │   │                      #   data table, AI insight panel)
    │   │   ├── country-radar.tsx   # country vs India category radar
    │   │   ├── country-trend-card.tsx    # + .test.tsx — pick indicator, dual-series trend
    │   │   ├── export-buttons.tsx # "use client" — window.print() + BOM-prefixed CSV Blob
    │   │   ├── indicator-trend-dialog.tsx# KPI click → full-history chart dialog
    │   │   ├── kpi-grid.tsx       # renders KpiCard[] as clickable buttons
    │   │   ├── leaderboard.tsx    # top-N table with India highlight
    │   │   ├── rankings-client.tsx# "use client" — sort/search/table + rank-over-time
    │   │   ├── report-card-radar.tsx    # India vs China radar
    │   │   ├── report-card-sections.tsx # accordion sections per category
    │   │   ├── scatter-chart.tsx  # + .test.tsx — 2-indicator scatter, Pearson r, India marker
    │   │   ├── stat-card.tsx      # reusable stat card
    │   │   ├── trend-chart.tsx    # multi-series Recharts line w/ historical event markers
    │   │   └── world-map-card.tsx # D3 Mercator choropleth (largest dashboard component)
    │   └── ui/                    # shadcn/ui primitives
    │       ├── badge, button, card, dialog, input, label, separator,
    │       │   select, sonner, table, tabs      (shadcn-generated)
    │       ├── flow-chips.tsx     # custom — motion-animated pill toggles, + flow-chips.test.tsx
    │
    ├── lib/
    │   ├── utils.ts               # cn() class merger
    │   ├── format.ts              # fmtValue(), fmtCompact()  (+ format.test.ts)
    │   ├── report-card.ts         # indicatorScore, average, gradeFor, prevValueInSeries
    │   │                           #   (+ report-card.test.ts)  — PURE, no DB
    │   ├── rankings.ts            # competitionRank, computeRankings, computeRankHistory,
    │   │                           #   rankDelta  (+ rankings.test.ts)  — PURE, no DB
    │   ├── rank-direction.ts      # LOWER_IS_BETTER set (37 ids) + isHigherBetter()
    │   ├── indicator-guides.ts    # ~68 hand-written {simpleWords, calculation, learnMore} guides
    │   ├── historical-events.ts   # 24 INDIA_EVENTS with proof URLs + eventsForIndicator()
    │   ├── data/
    │   │   ├── indicators.ts      # THE 123-INDICATOR REGISTRY + READY_SOURCES gate
    │   │   └── sources/           # 14 per-source fetchers:
    │   │       world-bank.ts       # API v2 client, pagination loop, aggregate filtering
    │   │       undp.ts            # HDR CSV download + parse + variable map
    │   │       who.ts             # GHO indicator fetch
    │   │       owid.ts            # CO2 dataset
    │   │       owid-generic.ts    # sequential OWID grapher + retries (parallel gets throttled)
    │   │       extra.ts           # extra grapher datasets (refugees, MPI, patents, air quality)
    │   │       wgi.ts             # governance CSV
    │   │       ti.ts              # Corruption Perceptions Index
    │   │       un-egov.ts         # World Bank Data360 EGDI CSV
    │   │       numbeo.ts          # HTML scrape, QOL/HCI/SAFETY/CRIME/COLI
    │   │       sdg.ts             # SDSN SDR xlsx repos
    │   │       doing-business.ts  # archived WB xlsx
    │   │       indices.ts         # 7 composite indices + resolveIso3() name→ISO3 with overrides
    │   │       extra-indices.ts   # GCI, GovTech maturity, ODIN, E-Participation
    │   ├── db/
    │   │   ├── client.ts          # driver auto-detect, pgSql() ?→$N, bulkInsert(),
    │   │   │                      #   runSqliteMigrations(), runPgMigrations(), closeDb()
    │   │   ├── queries.ts         # all app-level SQL (16 exported query functions)
    │   │   └── types.ts           # Country/Category/Indicator/DataPoint/Source + row mappers
    │   └── ai/
    │       ├── index.ts           # barrel re-export
    │       ├── client.ts          # Groq raw-fetch chat() + generateInsight()
    │       ├── embeddings.ts      # HuggingFace getEmbedding/getEmbeddings (UNUSED)
    │       └── vector-search.ts   # local TF-IDF + cosine retrieval, COUNTRY_ALIASES
    ├── test/setup.ts              # Vitest setup — imports @testing-library/jest-dom/vitest
    └── types/node-sqlite.d.ts     # local ambient types for node:sqlite
```

---

## 6. Database Design

### 6.1 Engines

The **same logical schema** is defined twice — `runSqliteMigrations()` (synchronous, multi-statement
`db.exec`) and `runPgMigrations()` (async, separate `CREATE TABLE IF NOT EXISTS` then a `DO $$ … $$`
block for indexes to avoid concurrent-creation races). Both run automatically on first `getDb()`.

**Differences between engines:**

| Aspect | SQLite (local) | PostgreSQL (production) |
|---|---|---|
| Driver | `node:sqlite` `DatabaseSync` | `pg` `Pool` |
| Activated by | absence of `DATABASE_URL` | presence of `DATABASE_URL` |
| Numeric types | `REAL` | `DOUBLE PRECISION` |
| `fetched_at` | `TEXT NOT NULL` (ISO string from app) | `TIMESTAMP NOT NULL DEFAULT NOW()` |
| Placeholders | `?` | `$1…$N` (rewritten by `pgSql()`) |
| Index creation | `CREATE INDEX IF NOT EXISTS` | `DO $$ IF NOT EXISTS (SELECT 1 FROM pg_class …) $$` |
| Pragmas | `journal_mode=WAL`, `foreign_keys=ON`, `synchronous=NORMAL` | n/a |
| Extra indexes | `idx_embeddings_indicator` created inline | created in the `DO $$` block |

### 6.2 Tables

**`countries`** — 217 rows **(live DB)**

| Column | Type | Null | Key | Source / notes |
|---|---|---|---|---|
| `iso3` | TEXT | no | **PK** | World Bank ISO3 (`IND`, `USA`). WB aggregates filtered out (`region.id !== 'NA'` and `id.length === 3`). |
| `iso2` | TEXT | yes | | WB `iso2Code` (`IN`) |
| `name` | TEXT | no | | WB country name |
| `region` | TEXT | yes | | WB `region.value` |
| `income_group` | TEXT | yes | | WB `incomeLevel.value` |
| `latitude` | REAL / DOUBLE PRECISION | yes | | `parseFloat(c.latitude)` |
| `longitude` | REAL / DOUBLE PRECISION | yes | | `parseFloat(c.longitude)` |

**`indicators`** — 123 rows **(live DB)**

| Column | Type | Null | Key | Source / notes |
|---|---|---|---|---|
| `id` | TEXT | no | **PK** | snake_case slug, e.g. `gdp_current_usd`, `life_expectancy` |
| `name` | TEXT | no | | Display name, e.g. "GDP (current US$)" |
| `category` | TEXT | no | | One of 10 (`Category` union in `types.ts`) |
| `source` | TEXT | no | | Source id, e.g. `world_bank`, `undp`, `owid` |
| `source_id` | TEXT | no | | Upstream code at the publisher, e.g. `NY.GDP.MKTP.CD`, `HDI`, `IP.TMK.RSCT` |
| `unit` | TEXT | yes | | `"USD"`, `"0-1"`, `"per 100k"`, `"ug/m3"`, … |
| `description` | TEXT | yes | | One-line explanation |
| `update_freq` | TEXT | yes | | `annual`, `biennial`, `triennial` |

**`data_points`** — 252,834 rows **(live DB)**; the fact table

| Column | Type | Null | Key | Notes |
|---|---|---|---|---|
| `country_iso3` | TEXT | no | **PK 1/3**, FK → `countries(iso3)` | |
| `indicator_id` | TEXT | no | **PK 2/3**, FK → `indicators(id)` | |
| `year` | INTEGER | no | **PK 3/3** | Live range **1950–2026** |
| `value` | REAL / DOUBLE PRECISION | **yes** | | Nulls are filtered out on ingest, but the column is nullable and every read path guards with `value IS NOT NULL` |
| `rank` | INTEGER | yes | | **Declared but never written and never read.** Dead column. |
| `fetched_at` | TEXT / TIMESTAMP | no | | Drives the 24h `isFresh()` staleness check |

**`sources`** — 33 rows **(live DB)**

| Column | Type | Null | Key | Notes |
|---|---|---|---|---|
| `id` | TEXT | no | **PK** | e.g. `world_bank` |
| `name` | TEXT | no | | e.g. "World Bank Open Data" |
| `url` | TEXT | yes | | Homepage |
| `type` | TEXT | yes | | `api` \| `csv` \| `pdf` \| `scrape` (union in `types.ts`; the seed only emits `api`/`pdf`) |

**`embeddings`** — 50,000 rows **(live DB)**

| Column | Type | Null | Key | Notes |
|---|---|---|---|---|
| `id` | TEXT | no | **PK** | `vec_<indicator_id>_<iso3>_<year>` |
| `chunk_text` | TEXT | no | | Human-readable: `"GDP (current US$) (gdp_current_usd) for IND in 2020: 2673000000000 USD"` |
| `source` | TEXT | no | | Provenance string, e.g. `data_point[IND:gdp_current_usd:2020]` |
| `indicator_id` | TEXT | yes | | Indexed |
| `country_iso3` | TEXT | yes | | |
| `year` | INTEGER | yes | | |
| `embedding` | TEXT | yes | | **Despite the name this is a JSON TF-IDF map, not a numeric vector:** `{"gdp":12.3,"current":8.1,…}` — top 50 terms per chunk. No dense-embedding row is ever inserted. |

### 6.3 Indexes

| Index | Table | Columns | Where created |
|---|---|---|---|
| (PK) | `countries` | `iso3` | inline |
| (PK) | `indicators` | `id` | inline |
| `PK data_points_pkey` | `data_points` | `(country_iso3, indicator_id, year)` | inline — also serves as the UPSERT conflict target |
| `idx_data_points_indicator_year` | `data_points` | `(indicator_id, year)` | both engines — serves `/api/indicators/series`, `getRankInYear`, `getLeaderboard`, `getLatestYear`, `/api/scatter` |
| `idx_data_points_country_year` | `data_points` | `(country_iso3, year)` | both engines — serves `getCountryHistory`, `getLatestSnapshot` |
| `idx_embeddings_indicator` | `embeddings` | `(indicator_id)` | both engines |

**Deliberately un-indexed:** `embeddings.embedding` (the TF-IDF blob) — `vectorSearch()` does
`WHERE embedding IS NOT NULL AND embedding != '' LIMIT 50000` and scores in Node, so it is an
intentional full scan bounded at 50k rows.

### 6.4 Mermaid — ER diagram

```mermaid
erDiagram
    COUNTRIES ||--o{ DATA_POINTS : "iso3 (FK)"
    INDICATORS ||--o{ DATA_POINTS : "id (FK)"
    COUNTRIES {
        TEXT iso3 PK "IND, USA, CHN…"
        TEXT iso2 "IN, US, CN…"
        TEXT name "not null"
        TEXT region "nullable"
        TEXT income_group "nullable"
        REAL latitude "nullable"
        REAL longitude "nullable"
    }
    INDICATORS {
        TEXT id PK "gdp_current_usd…"
        TEXT name "not null"
        TEXT category "10 categories"
        TEXT source "world_bank, undp, owid…"
        TEXT source_id "NY.GDP.MKTP.CD"
        TEXT unit "nullable"
        TEXT description "nullable"
        TEXT update_freq "annual|biennial|triennial"
    }
    DATA_POINTS {
        TEXT country_iso3 PK_FK "-> countries.iso3"
        TEXT indicator_id PK_FK "-> indicators.id"
        INTEGER year PK "1950-2026"
        REAL value "nullable"
        INTEGER rank "DECLARED, NEVER USED"
        TEXT fetched_at "not null, staleness check"
    }
    SOURCES {
        TEXT id PK "world_bank…"
        TEXT name "not null"
        TEXT url "nullable"
        TEXT type "api|pdf"
    }
    EMBEDDINGS {
        TEXT id PK "vec_<ind>_<iso>_<yr>"
        TEXT chunk_text "not null"
        TEXT source "not null"
        TEXT indicator_id "nullable, indexed"
        TEXT country_iso3 "nullable"
        INTEGER year "nullable"
        TEXT embedding "JSON TF-IDF map (top 50 terms)"
    }
```

> Note: `sources` has **no foreign key** to `indicators`. The link between them is the soft
> string column `indicators.source` = `sources.id`. This is why the missing `owid` row in
> `sources` does not break anything but does leave the registry inconsistent (§16).

### 6.5 Seed data & migrations

**There is no migration framework and no `drizzle.config.*`.** Despite `drizzle-orm` +
`drizzle-kit` being installed, schema management is entirely hand-rolled:

- **Migrations** = `runSqliteMigrations()` / `runPgMigrations()` in `src/lib/db/client.ts`,
  executed lazily inside `getDb()`. Both use `IF NOT EXISTS`, so they are idempotent and
  additive-only. **There is no down-migration, no schema version table, and no ALTER path** —
  adding a column to an existing table requires manual work.
- **Seed data** comes from two code-defined arrays, upserted by `seedStatic()` in
  `scripts/ingest.ts`:
  - `SOURCES[]` — 33 source records (`{id, name, url, type}`)
  - `INDICATORS[]` — 123 indicator records from `src/lib/data/indicators.ts`, each with
    `{id, name, category, source, sourceId, unit, description, freq}`
  - `countries` — fetched live from `fetchAllCountries()` (World Bank `/country?per_page=400`),
    filtered to real countries, then upserted.
- **`getAvailableIndicators()`** gates the registry through `isSourceReady()` against a
  `READY_SOURCES` set (35 entries) — a source id not in that set is excluded.

### 6.6 Live database snapshot (queried 2026-10-04)

| Metric | Value |
|---|---|
| `countries` | **217** |
| `indicators` | **123** |
| `data_points` | **252,834** |
| Distinct `indicator_id` in `data_points` | **117** |
| `sources` | **33** |
| `embeddings` | **50,000** |
| Year range | **1950 – 2026** |

**Indicators per category (registry count / with data):**

| Category | Registry | With data |
|---|---|---|
| economy | 22 | 22 |
| technology | 17 | 15 |
| society | 15 | 15 |
| healthcare | 14 | 14 |
| environment | 13 | 11 |
| governance | 10 | 10 |
| education | 10 | 9 |
| equality | 9 | 9 |
| safety | 8 | 8 |
| digital_gov | 5 | 4 |
| **Total** | **123** | **117** |

**Zero-point indicators (6, live DB):**
`broadband_speed`, `ccpi`, `digital_competitiveness`, `epi`, `qs_rank`, `startup_ecosystem`

> ⚠️ **Documentation drift.** `README.md` and `AGENTS.md` both state 120 indicators /
> ~105,740 data points / 34 sources / 20 zero-point indicators. The live DB is
> **123 / 252,834 / 33 / 6**. The registry grew (`patents_per_million`, `innovation_idx`)
> and re-ingestion resolved most gaps, but neither document was updated. Treat
> README/AGENTS counts as stale; use §6.6.

---

## 7. API / Backend Documentation

All endpoints are **Next.js Route Handlers** under `src/app/api/`. Every one is
**statically anonymous — there is no authentication, no session, no rate limiting, and no
API key check on any route.** All are read-only except the two `/api/ai/*` POSTs.

### 7.1 `GET /api/indicators/series`

`src/app/api/indicators/series/route.ts`

| | |
|---|---|
| **Purpose** | Full time series for one country × one indicator. Backs `ComparisonTool`, `CountryTrendCard`, `IndicatorTrendDialog`. |
| **Query params** | `country` (**required**, ISO3) · `indicator` (**required**, indicator id) |
| **Validation** | `if (!iso3 \|\| !indicatorId)` → `400 {error: "country and indicator parameters are required"}` |
| **DB call** | `getIndicatorSeries(iso3, indicatorId)` → `SELECT * FROM data_points WHERE country_iso3 = ? AND indicator_id = ? ORDER BY year` |
| **200 response** | `{ iso3: string, indicator: string, data: DataPoint[] }` where `DataPoint = {countryIso3, indicatorId, year, value, rank, fetchedAt}` — **not filtered for `value IS NOT NULL`**; every client filters `p.value != null` itself. |
| **Auth** | None |

### 7.2 `GET /api/indicators/leaderboard`

`src/app/api/indicators/leaderboard/route.ts`

| | |
|---|---|
| **Purpose** | Top-N countries for an indicator in a given year, plus the list of years that have data. Backs the world map (`limit=250`) and `ComparisonTool`'s auto-pick. |
| **Query params** | `indicator` (**required**) · `year` (optional int; defaults to `getLatestYear(indicator)` then falls back to the current calendar year) · `limit` (optional int, default **30**) |
| **Validation** | missing `indicator` → `400`; `parseInt` results are **not** range-checked (a `limit=-1` or `year=abc` passes straight through to SQL) |
| **DB calls** | `getLeaderboard(indicatorId, year, limit, isHigherBetter(indicatorId))` — direction-aware ORDER BY, `value IS NOT NULL`, LIMIT. Plus `SELECT DISTINCT year … ORDER BY yr DESC`. |
| **200 response** | `{ indicator: string, year: number, years: number[], data: Array<{iso3: string, value: number \| null}> }` |
| **Auth** | None |

### 7.3 `GET /api/rankings`

`src/app/api/rankings/route.ts`

| | |
|---|---|
| **Purpose** | Everything `/rankings` needs in one round-trip: full world ranking for an indicator, India's row, and India's rank history. |
| **Query params** | `indicator` (**required**) |
| **Validation** | missing → `400 {error:"indicator parameter is required"}`; unknown id → `404 {error:"unknown indicator"}` |
| **DB calls** | `Promise.all([getIndicator, getRankingsForIndicator, getAllCountries])` then `getIndicatorSeries("IND", indicatorId)`. Uses `getGlobalLatest()` (each country's **own** most recent year, not a common year). |
| **Pure logic** | `computeRankings(latest, higherIsBetter)` and `computeRankHistory(indiaSeries, higherIsBetter)` from `src/lib/rankings.ts` |
| **200 response** | `{ indicator: {id,name,unit,category,description}, higherIsBetter: boolean, ranking: RankRow[], india: RankRow \| null, history: HistoryPoint[], names: Record<iso3,string> }` |
| **Auth** | None |

### 7.4 `GET /api/scatter`

`src/app/api/scatter/route.ts`

| | |
|---|---|
| **Purpose** | Cross-indicator correlation scatter — one point per country with data for **both** indicators, plus Pearson r. |
| **Query params** | `x` (**required**, indicator id) · `y` (**required**, indicator id) |
| **Validation** | missing either → `400 {error:"x and y indicator parameters are required"}` |
| **DB calls** | `Promise.all` of 4: indicator metadata for both ids, all countries, `getGlobalLatest(xId)`, `getGlobalLatest(yId)` |
| **Math** | `pearson(points)` inline — returns `null` when `points.length < 3` or the denominator is 0 |
| **200 response** | `{ x: {id,name,unit}, y: {id,name,unit}, points: Array<{iso3,name,x,y,xYear,yYear}>, correlation: number \| null, india: point \| null }` |
| **Auth** | None |

### 7.5 `POST /api/ai/chat`

`src/app/api/ai/chat/route.ts` (248 lines — the largest route)

| | |
|---|---|
| **Purpose** | Retrieval-augmented Q&A over the dashboard's own data, with inline citations. |
| **Body** | `{ question: string (required), conversationHistory?: Array<{role, content}> }` |
| **Validation** | `if (!question)` → `400 {error:"question is required"}`. **No length limit, no role whitelist, no rate limit.** `conversationHistory` is spread straight into the prompt. |
| **Retrieval** | `vectorSearch(question, 15)` first; on `null` falls back to keyword `buildContext(question)` (5 strategies, capped at 50 chunks). Matched `INDIA_EVENTS` are **always** appended because they are not in the TF-IDF index. |
| **LLM** | `chat(messages, {temperature: 0.2, maxTokens: 1500})` → Groq `llama-3.3-70b-versatile`. System prompt: answer only from context, cite as `[source_id]`, **under 300 words**. |
| **200 responses** | (a) `{answer, citations: []}` canned "no data" reply · (b) `{answer, citations: []}` "AI unavailable. Set GROQ_API_KEY…" when the key is absent · (c) `{answer, citations: [{id, source, text.slice(0,200)}]}` · `citations` are derived by regex-matching `[…]` markers in the answer back to context chunk ids |
| **Error** | `500 {error: message}` inside try/catch |
| **Auth** | None. **Anyone can spend the Groq quota.** |

### 7.6 `POST /api/ai/insights`

`src/app/api/ai/insights/route.ts`

| | |
|---|---|
| **Purpose** | One-shot "analyse this country" summary (3 sentences). |
| **Body** | `{ iso3?: string (default "IND"), year?: number }` |
| **DB calls** | `Promise.all` of 7: `getLatestSnapshot`, `getAllCountries`, and 4 series (`co2_per_capita`, `gdp_current_usd`, `hdi`, `life_expectancy`) + `getLeaderboard("gdp_current_usd", year ?? currentYear, 10)` |
| **LLM** | **`groq-sdk`** `groq.chat.completions.create({model: "llama-3.3-70b-versatile", max_tokens: 300})` — a *different* code path from `/api/ai/chat` |
| **200 response** | `{ analysis: string }` |
| **Error** | `500 {error: err.message}` — leaks raw error text |
| **Auth** | None |

> ⚠️ **Inconsistent AI wiring — real bug.** This route does
> `const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })` at **module scope**, so the
> module throws during import when `GROQ_API_KEY` is unset, turning the route into a 500 with
> an opaque message. `/api/ai/chat` deliberately does the opposite (returns `null` and degrades
> to a helpful "set GROQ_API_KEY" message). The README claims `/api/ai/*` is live; in practice
> `/api/ai/insights` is fragile and, per §16, appears to be **unreferenced by any UI**.

### 7.7 Middleware, authentication and authorisation

| Concern | Status |
|---|---|
| `middleware.ts` | **Does not exist.** No middleware of any kind. |
| Authentication | **None.** No auth library installed, no session, no cookie, no login page, no user table. |
| Authorisation | **None.** Every route and every page is world-readable and world-writable where applicable. |
| Rate limiting | **None.** Not on `/api/ai/chat`, not on `/api/ai/insights`, not on DB reads. |
| Input validation | Hand-rolled truthiness checks only. **`zod` is installed but never imported** — no schema validation, no length caps, no sanitisation. |
| SQL injection | **Not exploitable in practice.** Every query goes through parameterised `?` → `$N` binding; identifiers are never interpolated from user input. |
| CORS | Default (same-origin only). No `Access-Control-*` headers set anywhere. |
| CSRF | Not applicable — no cookies, no session, no state-changing authenticated endpoints. |
| Security headers | **None.** `next.config.ts` is empty — no CSP, no HSTS, no `X-Frame-Options`, no `Referrer-Policy`. |
| Secrets | `.env*` is gitignored except `.env.example`, which contains only empty placeholders. API keys are read from `process.env` server-side only and never reach client bundles. |

### 7.8 Ingestion CLI surface (not HTTP, but the write API)

| Command | Script | Notes |
|---|---|---|
| `npm run ingest` | `scripts/ingest.ts` | Full run: seeds sources/indicators/countries, then ingests every source. `FROM_YEAR = 2010`, `CONCURRENCY = 5`, `STALE_HOURS = 24`. Prints per-indicator ✓/⏭/✗ plus a final summary. |
| `npm run ingest:wb` | `scripts/ingest.ts world_bank` | ⚠️ **The `world_bank` argv is never read** — `ingest.ts` ignores `process.argv`, so this runs the *full* ingestion, not just World Bank. Misleading script name. |
| `npm run ingest:new` | `scripts/ingest-new.ts` | Targeted: `trademark_applications`, `patents_per_million`, `air_quality`, and the 7 composite indices. Uses a hardcoded 30-country `FOCUS_COUNTRIES` list. |
| `npm run index-embeddings` | `scripts/index-embeddings.ts` | Deletes and rebuilds `embeddings`. `MAX_CHUNKS = 50000`, top-50 terms/chunk. |
| `npm run status` | `scripts/status.ts` | Coverage report incl. the zero-point indicator list. |
| `npm run migrate-pg` | `scripts/migrate-to-pg.ts` | ⚠️ **Broken** — the file on disk is `migrate-to-pg.mjs`. |

All five working scripts use `set NODE_OPTIONS=--no-warnings&&` (Windows `cmd` syntax — these
**will not run on macOS/Linux shells as written**) to suppress the `node:sqlite` experimental warning.

---

## 8. Frontend Documentation

### 8.1 Pages / routes

| Route | File | Rendering | Data strategy |
|---|---|---|---|
| `/` | `src/app/page.tsx` | RSC, `export const dynamic = "force-dynamic"` | `Promise.all` of 6 queries, then 4 more; ~40 sequential-ish `getIndicatorSeries` calls inside nested `Promise.all` for the 5-country × 4-indicator trend charts |
| `/explore` | `src/app/explore/page.tsx` → `explore-client.tsx` | RSC shell + client island | Server: `getIndicatorCoverage()`, `getDashboardStats()`, `SELECT DISTINCT category`. All filtering/search is client-side |
| `/indicator/[id]` | `src/app/indicator/[id]/page.tsx` | RSC, dynamic segment | `notFound()` if the id is unknown; `getLatestSnapshot`, `getAllCountries`, `getLatestYear`, `getRankInYear`, `getLeaderboard`, 5 series, `getGuide()`, `eventsForIndicator()` |
| `/country/[iso3]` | `src/app/country/[iso3]/page.tsx` | RSC, dynamic segment | `notFound()` for an unknown ISO3. **`getLatestRanks(allIndicatorIds, [code, "IND"])` in one round-trip** — the AGENTS.md notes this replaced ~220 round-trips with 6. Also `getCountryHistory` for sparklines + trends |
| `/compare` | `src/app/compare/page.tsx` → `comparison-tool.tsx` | RSC + `force-dynamic` | Server passes `countries`, `indicatorsByCategory`, and indicator count. **All series data is fetched client-side** |
| `/rankings` | `src/app/rankings/page.tsx` → `rankings-client.tsx` | RSC + `force-dynamic` | Server passes the indicator list (data-bearing only) + `?indicator=` initial. Table data fetched client-side |
| `/report-card` | `src/app/report-card/page.tsx` → `report-card-sections.tsx` | RSC + `force-dynamic` | `getLatestRanks(allIds, ["IND","CHN"])` batched; radar/accords are client |
| `/methodology` | `src/app/methodology/page.tsx` | RSC + `force-dynamic` | `getDashboardStats`, `getAllCountries`, `getIndicatorCoverage` for the badge counts; the 6-step scoring narrative is a hardcoded `SCORING[]` array |
| `/chat` | `src/app/chat/page.tsx` → `chat-interface.tsx` | Static RSC shell + fully client chat | No server data at all |

`force-dynamic` is set on `/`, `/compare`, `/rankings`, `/report-card`, `/methodology` — these
are never statically cached. `/explore`, `/indicator/[id]`, `/country/[iso3]`, and `/chat` have
no explicit directive, so they fall back to Next 16 defaults.

### 8.2 Key components

**`src/components/site-nav.tsx`** — `"use client"`, sticky `top-0 z-50` bar with `backdrop-blur`.
`LINKS` array of 8 entries: `/`, `/country/IND`, `/rankings`, `/explore`, `/compare`,
`/report-card`, `/methodology`, `/chat`. Desktop = inline `md:flex` row; mobile = a
`Menu`/`X` toggle button (`aria-expanded`, `aria-label="Toggle menu"`) opening a dropdown that
closes on link click.

**`src/components/dashboard/world-map-card.tsx`** — the most complex component.
Fetches `/world-110m.json`, runs `feature(topology, topology.objects.countries)`, filters by
continent, projects with `d3.geoMercator().fitSize([880, 420], …)`, and renders SVG paths.
Has `NUM_ID_TO_ISO3` mapping (Natural Earth numeric ids → ISO3), `PASTEL_STOPS` colour ramp +
`pastelColor(t)`, `CONTINENTS` grouping, a year selector driven by the `years[]` array from
`/api/indicators/leaderboard`, hover tooltip state, and country-label toggling. Fetches
`/api/indicators/leaderboard?indicator=…&limit=250[&year=…]`.

**`src/components/dashboard/scatter-chart.tsx`** (`ScatterCard`) — two indicator `<select>`s,
fetches `/api/scatter`, renders a Recharts scatter with India visually distinguished, plus a
Pearson *r* readout and percentile chips. Home page initialises to
`x = gni_per_capita`, `y = innovation_idx`.

**`src/components/dashboard/comparison-tool.tsx`** — `useSearchParams()` for `?country=` /
`?indicator=` deep links; `selectedCountries` state; auto top-N pick via
`/api/indicators/leaderboard` on `[selectedIndicator, countryCount]` change (always unshifting
`IND` to the front); parallel `Promise.all` of `/api/indicators/series` per country;
`chartData` joins series on a union-of-years axis; radar normalises min→0, max→100.
`AI insight` button POSTs a templated question to `/api/ai/chat`.

**`src/components/ui/flow-chips.tsx`** — custom, `memo`ised, uses `motion/react` for a spring
FLIP layout so selected chips flow to the front. Uses a `Set` for the selected-lookup to keep
sorting linear across the 217-country row (comment explicitly notes `selected.includes` inside
a sort is O(n²) on every keystroke).

**`src/components/dashboard/report-card-sections.tsx`** — collapsible accordions keyed by
`aria-controls="report-section-<category>"`, first section open by default (asserted by the E2E spec).

**`src/components/dashboard/export-buttons.tsx`** — `handlePrint()` calls `window.print()`;
`handleCsv()` hand-builds a CSV string with quoted/escaped names, prepends a `\uFEFF` BOM for
Excel, creates a `Blob`, and triggers a download named `india-report-card-<year>.csv`. Wrapped in
`print:hidden` so it disappears in print output.

**`src/components/chat/chat-interface.tsx`** — seeded assistant greeting, 4 `SUGGESTIONS`
chips (shown only while `messages.length === 1`), auto-scroll via a `bottomRef`, optimistic
user message, sends `conversationHistory`. Citations render in a `<details>` disclosure with
`open ↗` links when `c.source` starts with `http`.

### 8.3 State management

There is **no global store**. Despite `zustand` being a dependency, it is never imported.

| Kind | Mechanism |
|---|---|
| Server data | Fetched in the RSC and passed down as props |
| Page-local UI state | `useState` — e.g. `SiteNav.open`, `WorldMapCard.{selectedIndicator, selectedYear, hovered, showLabels, continent}` |
| Cross-page state | **None** — no context providers at all |
| URL as state | `?category=` (Explore), `?indicator=` (Rankings, Compare), `?country=` (Compare), `?indicator=` (Country trend card) |
| Server state cache | **None.** No React Query/SWR. Every client island `fetch`es on mount / on dependency change with a manual `cancelled` flag |
| Theme | No provider mounted despite `next-themes` + dark tokens |
| Toasts | `ui/sonner.tsx` exists but `<Toaster/>` is never rendered |

### 8.4 Styling approach

Tailwind v4 utility-first, CSS-first config. `src/app/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@custom-variant dark (&:is(.dark *));
@theme inline { --color-background: var(--background); … --radius-4xl: calc(var(--radius)*2.6); }
:root { --background: oklch(1 0 0); … }        /* light tokens */
.dark { … }                                     /* dark tokens */
```

- Design language: **amber** is the primary brand accent (India Dashboard), with per-page
  accent gradients (`amber` home, `blue` Explore/Compare, `violet` Rankings, green/red for
  grades, violet for historical events).
- Fonts: `Geist` + `Geist_Mono` via `next/font/google`, exposed as `--font-geist-sans` /
  `--font-geist-mono` and mapped into `--font-sans` / `--font-mono`.
- Layout is hand-rolled with Tailwind spacing utilities (`mx-auto max-w-7xl px-6 py-8`,
  `grid gap-6 lg:grid-cols-2`) — **no layout library**.
- Colour tokens are OKLCH throughout, not hex.
- All theme colours are semantic (`bg-background`, `text-muted-foreground`, `border-input`),
  so dark mode works purely at the token level.

### 8.5 Forms & validation

There is **no form library** (no react-hook-form, no zod) and **one** form in the app.

| Location | Control | Validation |
|---|---|---|
| `chat-interface.tsx` | `<form onSubmit={handleSubmit}>` | Manual only: trims input, no-ops if `!q \|\| loading`; submit button `disabled={loading \|\| !input.trim()}`. No max length. |
| `comparison-tool.tsx` | country search `<input type="text">` | Client-side substring filter, re-filters 217 rows per keystroke |
| `explore-client.tsx` | "Search indicators…" input | Client-side substring filter |
| `rankings-client.tsx` | "Search countries…" input | Client-side substring filter |
| various | `<select>` indicator pickers | `onChange` sets state; no validation |

Server-side, the only validation is `if (!param) return NextResponse.json({error}, {status:400})`
in the three GET routes and `if (!question)` in `/api/ai/chat`.

---

## 9. Business Logic

### 9.1 Direction awareness — `src/lib/rank-direction.ts`

The single most important domain rule. `LOWER_IS_BETTER` contains **37 indicator ids**;
`isHigherBetter(id)` returns `!LOWER_IS_BETTER.has(id)`.

| Group | Lower-is-better ids |
|---|---|
| Economy | `inflation_pct`, `unemployment_pct`, `public_debt_pct_gdp`, `self_employed`, `global_competitiveness` |
| Society | `multidim_poverty`, `age_dependency`, `refugee_population` |
| Governance | `press_freedom`, `corruption_idx` (higher = more corrupt) |
| Education | `student_teacher` |
| Healthcare | `infant_mortality`, `maternal_mortality`, `suicide_mortality`, `undernourishment` |
| Environment | `ccpi`, `air_quality` (PM2.5), `co2_per_capita`, `co2_emissions_total`, `water_stress`, `fossil_fuel_energy` |
| Safety | `crime_idx`, `terrorism_idx`, `road_safety`, `disaster_risk`, `intentional_homicides`, `military_expenditure` |
| Equality | `gini`, `gender_inequality`, `poverty_215`, `vulnerable_employment` |
| Technology | `qs_rank`, `startup_ecosystem` |
| Digital gov | `digital_competitiveness`, `open_data` |

This one predicate drives: SQL `ORDER BY` direction, `RANK() OVER` direction, the trend
arrow's green/red colouring, the "↑ higher is better / ↓ lower is better" badge on indicator
pages, bar ordering, and the Compare page's improvement language. **`rank-direction.ts` is the
single source of truth and is applied consistently.**

### 9.2 Scoring — `src/lib/report-card.ts` (pure, unit-tested)

```ts
indicatorScore(rank, total) = ((total - rank + 1) / total) * 100   // best → 100
  guard: !isFinite(rank) || !isFinite(total) || total <= 1  →  return 50
average(scores) = sum / length,  or null when empty
```

Aggregation order for the report card:
1. Per-indicator score from `getLatestRanks` (rank of the country's own latest year).
2. **Category score = `average()` of that category's indicator scores.**
3. **Overall score = `average()` of the category scores** (not of all indicators — categories
   are equally weighted regardless of how many indicators they contain).
4. `gradeFor(score)`:

| Score | Letter | Label | Colour |
|---|---|---|---|
| ≥ 85 | **A** | Excellent | `text-green-600` |
| ≥ 70 | **B** | Good | `text-emerald-600` |
| ≥ 55 | **C** | Fair | `text-amber-600` |
| ≥ 40 | **D** | Below average | `text-orange-600` |
| < 40 | **F** | Weak | `text-red-600` |

5. `prevValueInSeries(series, year)` finds the most recent non-null value **strictly before**
   `year`, so gap-filled series (biennial data) don't break trend maths.
6. `getTrend(current, previous)` → `pct = (cur - prev) / |prev| × 100`; `|pct| < 0.1` → Stable;
   else `> 0` → green `+x.x%`, `< 0` → red `-x.x%`. **This is raw direction, not "improving"** —
   the indicator page separately computes `improving = higherBetter ? pct >= 0 : pct < 0` and
   colours green/red by *improving* while pointing the arrow by *raw* direction.

The methodology page's stated formula is `100 × (1 − (rank − 1)/total)`, which is
**algebraically equivalent** to `((total − rank + 1)/total) × 100`. Good — the docs match the code.

### 9.3 Ranking — `src/lib/rankings.ts` (pure, unit-tested)

```ts
competitionRank(values, value, higherIsBetter)
  higherIsBetter → values.filter(v => v > value).length + 1
  else           → values.filter(v => v < value).length + 1
```
→ **standard competition ranking: 1, 2, 2, 4** (ties share the best rank; the next rank skips).

```ts
computeRankings(rows, higherIsBetter) → RankRow[]
  total      = rows.length
  rank       = competitionRank(...)
  percentile = total > 1 ? ((total - rank) / (total - 1)) * 100 : 100   // rounded to 1 dp
```
Rank 1 → percentile 100, last place → 0.

```ts
computeRankHistory(series, higherIsBetter) → HistoryPoint[]   // India ranked WITHIN each year
rankDelta(history) = last.rank - secondToLast.rank             // positive = slipped down
```

Note the **two different percentile formulas** in the codebase: `rankings.ts` uses
`((total-rank)/(total-1))*100`, while `report-card.ts` uses `((total-rank+1)/total)*100`.
Both are percentile-like but not identical (last place is 0 in one, ~1 in the other). Not a
bug per se, but worth knowing when cross-reading the Rankings page and the Report Card.

### 9.4 Batched latest-rank computation — `getLatestRanks()` in `src/lib/db/queries.ts`

The key performance abstraction. For a set of indicator ids × country iso3s, it returns each
country's rank **among all countries, in that country's own latest year**, in **one** query:

```sql
WITH latest AS (
  SELECT indicator_id, country_iso3, value, year,
         ROW_NUMBER() OVER (PARTITION BY indicator_id, country_iso3 ORDER BY year DESC) AS rn
  FROM data_points WHERE value IS NOT NULL
),
ranked AS (
  SELECT indicator_id, country_iso3, year,
         RANK()      OVER (PARTITION BY indicator_id, year ORDER BY <dirExpr>) AS rank,
         COUNT(*)    OVER (PARTITION BY indicator_id, year)                     AS total
  FROM latest l WHERE rn = 1
)
SELECT … FROM ranked WHERE country_iso3 IN (…) AND indicator_id IN (…)
```

`<dirExpr>` handles mixed directions in one pass by negating values for lower-is-better ids:
```sql
(CASE WHEN l.indicator_id IN (<lowerBetterIds>) THEN l.value ELSE -l.value END) ASC
```
Used by `/country/[iso3]` (replaced ~220 round-trips with 6) and `/report-card`.

### 9.5 Correlation — `pearson()` inline in `/api/scatter/route.ts`

```
r = (n·Σxy − Σx·Σy) / sqrt((n·Σx² − (Σx)²)(n·Σy² − (Σy)²))
returns null when n < 3 or the denominator is 0
```

### 9.6 Formatting — `src/lib/format.ts` (pure, unit-tested)

```ts
fmtValue(v, unit?)  → "—" when null; T (1e12), B (1e9), M (1e6), k (1e3), else toLocaleString
                      (maxFractionDigits: unit === "%" ? 1 : 2); appends " " + unit when present
fmtCompact(v)       → same thresholds via trim() (max 2 dp, trailing zeros dropped) — for axes
```

### 9.7 Historical events — `src/lib/historical-events.ts`

24 hand-curated `INDIA_EVENTS` entries, each `{year, label, description, source (proof URL), sourceLabel, indicatorIds[]}`.
Used in two places:
- `eventsForIndicator(indicatorId, category)` → indicator pages ("What moved this number — with sources").
- `eventChunksFor(question)` in `/api/ai/chat` → keyword matching (covid, demonetization, jio,
  gst, aadhaar, paris, swachh, ayushman, NEP, mgnrega …).

Notable entries: 1991 Liberalisation, 2005 FDI liberalisation, 2006 MGNREGA, 2008 GFC,
2008 DST Nanotech Mission, 2009 RTE Act + UPI development, 2010 Aadhaar, 2014 PM Modi /
Swachh Bharat, 2015 Paris Agreement, 2016 Demonetisation / Jio / Ujjwala, 2017 GST +
Triple Talaq, 2018 Ayushman Bharat, 2019 Article 370 / NCAP, 2020 COVID + NEP 2020 +
COVID vaccine drive, 2021 DBT surge, 2022 Russia-Ukraine shock.

### 9.8 TF-IDF retrieval — `scripts/index-embeddings.ts` + `src/lib/ai/vector-search.ts`

**Index build:** one chunk per data point, text template:
`"{indicator_name} ({indicator_id}) for {country_iso3} in {year}: {value}{ unit}"`
- `idf(term) = ln((N + 1) / (df + 1)) + 1` (smoothed)
- `weight(term) = tf × idf`
- Keep only the **top 50 terms** per chunk, store as a JSON object in `embeddings.embedding`
- `MAX_CHUNKS = 50000`, `BATCH_SIZE = 100`, table fully cleared first
- Corpus is ordered `ORDER BY indicator_id, country_iso3, year` then `.slice(0, 50000)` →
  ⚠️ **the cap silently truncates by alphabetical indicator**, so later indicators are not indexed.

**Query:** `tokenize()` lowercases, strips non-alphanumerics, drops 1-char and pure-numeric
tokens, and first substitutes `COUNTRY_ALIASES` (34 names → ISO3, e.g. `"united states"→"usa"`).
Builds a query TF-IDF vector, then computes cosine similarity against every parsed chunk,
sorts desc, returns `topK = 15`.

### 9.9 Ingestion rules

- Idempotency: `ON CONFLICT(country_iso3, indicator_id, year) DO UPDATE SET value=excluded.value, fetched_at=excluded.fetched_at`.
- Freshness: `isFresh(id)` = `MAX(fetched_at)` within 24 h → skip.
- Writes go through `bulkInsert(table, columns, rows, onConflict, chunkSize=500)` — the AGENTS.md
  notes per-row `execute` loops are ~100× slower against remote PG.
- World Bank aggregates are excluded (`region.id !== 'NA'`), so the map/rankings show real
  countries only.
- `FOCUS_COUNTRIES` in `ingest.ts` is an **empty array** → WB fetches `/country/all` (all
  countries), whereas `ingest-new.ts` has a **hardcoded 30-country list** → inconsistent breadth
  between the two ingest paths.
- `FROM_YEAR = 2010` for WB indicators (yet the DB contains data back to 1950 — pulled in by
  the non-WB sources).
- `owid-generic.ts` fetches datasets **sequentially with retries**; the file comment records
  that parallel bursts to `raw.githubusercontent.com` get throttled.

### 9.10 Roles, permissions, pricing, orders, payments, notifications

| Concern | Status |
|---|---|
| Roles / permissions | **N/A** — no users, no auth. |
| Pricing / orders / payments | **N/A** — free, no commerce code, no payment gateway. |
| Notifications (email/SMS/push) | **N/A** — no notification code; `sonner` toasts exist but are unmounted. |
| Caching layer | **N/A** — no Redis/memcache. Next.js fetch cache + `force-dynamic` only. |

---

## 10. Third-Party Integrations

### 10.1 AI — Groq (primary)

| | |
|---|---|
| Env var | `GROQ_API_KEY` (name only; value lives in `.env` / Vercel env) |
| Wired in | `src/lib/ai/client.ts` — raw `fetch` to `https://api.groq.com/openai/v1/chat/completions`, OpenAI-compatible schema |
| Also | `src/app/api/ai/insights/route.ts` — via `groq-sdk@^1.4.1`, module-scope client |
| Models | Default `llama-3.3-70b-versatile`; typed alternatives `mixtral-8x7b-32768`, `gemma2-9b-it` |
| Defaults | `temperature 0.3`, `max_tokens 1024`; `/api/ai/chat` overrides to `0.2` / `1500`; insights uses `300` |
| Failure mode | `chat()` returns `null` on missing key, non-OK status, or throw → route degrades to a "set GROQ_API_KEY" message |
| Barrel | `src/lib/ai/index.ts` re-exports `chat`, `generateInsight`, and the embedding helpers |

### 10.2 AI — HuggingFace Inference (implemented, **not wired**)

| | |
|---|---|
| Env var | `HF_API_KEY` |
| Endpoint | `https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2` |
| Wired in | `src/lib/ai/embeddings.ts` only — `getEmbedding()` / `getEmbeddings()` |
| Status | ⚠️ **Zero call sites.** `scripts/index-embeddings.ts` builds TF-IDF, not dense vectors. The `embeddings.embedding` column holds TF-IDF JSON. `HF_API_KEY` has no effect on app behaviour. |

### 10.3 Database providers

| | |
|---|---|
| Supabase PostgreSQL | Intended production store. Activated by `DATABASE_URL` (`postgresql://user:pass@host:5432/dbname`). Schema auto-created by `runPgMigrations()`. ⚠️ **Currently broken — see §13 / §16.** |
| Node built-in SQLite | Local/dev store at `data/india.db` (path from `DATABASE_PATH`). |
| Supabase JS client | **Not installed and not used** — no `@supabase/supabase-js`, no auth/storage/realtime. Only the raw Postgres wire protocol via `pg`. |

### 10.4 Data sources (see §3.8 for the full 33-row table)

Integration styles actually used:

| Style | Examples |
|---|---|
| REST/JSON API | World Bank API v2 (`wbFetch`/`wbFetchAll` with pagination loop), WHO GHO, TI, OECD, V-Dem, INFORM, ITU |
| CSV download + parse | UNDP HDR CSV (`data/raw/undp_hdr.csv`), WGI, WB Data360 EGDI |
| OWID grapher CSV | CO₂, fossil share, refugees, MPI, patents/million, air quality, democracy, rule of law + 10 mirrors |
| XLSX parse (`xlsx` pkg) | WIPO GII, Portulans NRI, WB Doing Business (via `adm-zip`), E-Participation, SDSN SDR |
| HTML scrape | Numbeo (QOL/HCI/SAFETY/CRIME/COLI from one page) |
| PDF-declared / no fetcher | `wjp`, `yale`, `germanwatch`, `imd`, `oxford`, `sspi`, `sdg`, `qs`, `od`, `turtle`, `wipo`, `doing_business` (typed `pdf` in `sources`, ingested from xlsx/csv twins) |

World Bank requests set a `User-Agent` of `IndiaInGlobalDashboard/0.1 (+https://github.com/...)`
and Next.js `next: { revalidate: 60*60*24 }` on the upstream fetch.

### 10.5 Not integrated (explicitly confirmed absent)

Payments (Stripe/Razorpay), auth providers (NextAuth/Clerk/Supabase Auth), email (Resend/SendGrid/Nodemailer),
SMS, WhatsApp, push notifications, analytics (GA/Plausible/PostHog), error tracking (Sentry),
map tiles (Mapbox/Google Maps — the map is pure SVG from a committed TopoJSON file),
cloud storage (S3/R2), CDN config, feature flags, rate limiting, CSRF protection, i18n.

---

## 11. Configuration and Environment

### 11.1 Environment variables (names and purposes only — no values)

| Variable | Required? | Purpose | Consumed by |
|---|---|---|---|
| `DATABASE_PATH` | No (has default) | Filesystem path to the local SQLite file. Defaults to `<cwd>/data/india.db`. | `src/lib/db/client.ts` |
| `DATABASE_URL` | No | PostgreSQL connection string. **Its mere presence flips the driver from SQLite to `pg`.** `.env.example` shows the shape `postgresql://user:pass@host:5432/dbname`. | `src/lib/db/client.ts` (`isPg()`, `pgSql()`, `new Pool`) |
| `GROQ_API_KEY` | Optional | Groq API key for the AI chat and insights. Dashboard is fully functional without it — AI degrades with a helpful message. | `src/lib/ai/client.ts`, `src/app/api/ai/insights/route.ts` |
| `HF_API_KEY` | Optional | HuggingFace token. **Currently unused** — no code path calls the embeddings module. | `src/lib/ai/embeddings.ts` (never invoked) |

`.env.example` (committed) contains only these four names with empty values. `.env` and
`.env.local` exist locally and are gitignored (`.gitignore` has `.env*` with `!.env.example`).
Per `AGENTS.md`, `.env` no longer contains `DATABASE_URL` (the dead host was removed) and the
`.env.local` written by the Vercel CLI holds a masked placeholder.

> **Env loading is asymmetric.** `dotenv/config` is imported by the four CLI scripts only.
> The Next.js app does **not** import `dotenv` — it relies on Next.js's own `.env` /
> `.env.local` loading. So during `npm run dev`, `DATABASE_PATH` and `GROQ_API_KEY` reach the
> app via Next's loader, and during `npm run ingest` they reach the scripts via dotenv. Both
> read the same files, so behaviour matches, but the mechanism differs by entrypoint.

### 11.2 Config files

| File | Contents |
|---|---|
| `next.config.ts` | **Effectively empty** — `const nextConfig: NextConfig = { /* config options here */ }`. No images config, no headers, no redirects, no experimental flags, no `output: "standalone"`. |
| `tsconfig.json` | `target ES2017`, `strict: true`, `noEmit`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `incremental`, `plugins: [{name:"next"}]`, `paths: {"@/*": ["./src/*"]}`, includes `.next/types/**/*.ts` |
| `vitest.config.ts` | `environment: "jsdom"`, `globals: true`, `setupFiles: ["./src/test/setup.ts"]`, `include: ["src/**/*.{test,spec}.{ts,tsx}"]`, `@` alias |
| `playwright.config.ts` | `testDir: "./e2e"`, `timeout 90s`, `expect.timeout 20s`, `fullyParallel: false`, `workers: 1`, `retries: 0`, `forbidOnly: !!process.env.CI`, reporters `list` + `html` → `playwright-report`, `use.baseURL "http://localhost:3456"`, `trace: retain-on-failure`, `screenshot/video: only/retain-on-failure`, single `chromium` project. **No `webServer` block.** |
| `postcss.config.mjs` | `@tailwindcss/postcss` |
| `eslint.config.mjs` | flat config extending `eslint-config-next` |
| `components.json` | shadcn/ui config (style, aliases, base colour) |
| `.gitignore` | `.env*` (except `.env.example`), `data/*.db*`, `.next/`, `.vercel`, `*.tsbuildinfo`, `playwright-report/`, `test-results/` |
| `src/app/globals.css` | Tailwind v4 theme tokens (OKLCH), dark variant, radius scale |
| `src/types/node-sqlite.d.ts` | local ambient types for the `node:sqlite` module |

### 11.3 Build & run commands

```bash
npm install            # install
npm run dev            # next dev                    → http://localhost:3000
npm run build          # next build
npm start              # next start
npm run lint           # eslint

npm run ingest         # full ingestion (all 33 sources)
npm run ingest:wb      # ⚠️ arg ignored → also runs the FULL ingestion
npm run ingest:new     # targeted re-ingest of newest sources
npm run index-embeddings   # rebuild TF-IDF index
npm run status         # coverage + zero-point report
npm run migrate-pg     # ⚠️ BROKEN (file is .mjs, script expects .ts)

npm test               # vitest run (unit + component)

npx playwright test    # E2E — requires a dev server already on :3456
```

The five data scripts use `set NODE_OPTIONS=--no-warnings&&` — **Windows `cmd` syntax**. On
POSIX shells the `set` builtin will not export `NODE_OPTIONS`; it must be changed to
`NODE_OPTIONS=--no-warnings tsx …` for macOS/Linux (CI) to work correctly.

---

## 12. Setup and Installation

### 12.1 Prerequisites

| Requirement | Version | Why |
|---|---|---|
| Node.js | **22+** | `node:sqlite` (`DatabaseSync`) is only stable/available from Node 22. On Node 20 the local DB path fails. |
| npm | ships with Node | All scripts are npm-based. |
| Git | any | Repo is a git repo (`origin/master` referenced in AGENTS.md). |
| Network access | required for `npm run ingest` | Hits 33 external sources. |
| Windows or POSIX | both work | ⚠️ The ingest npm scripts use `set VAR=…&&` (cmd). On macOS/Linux they need rewriting to `VAR=… cmd`. |
| Supabase project | only for production | Required because SQLite cannot run on Vercel serverless. |

### 12.2 Local setup — step by step

```bash
# 1. Install dependencies
cd India-dashboard
npm install

# 2. Create your env file from the template
cp .env.example .env          # PowerShell: copy .env.example .env

# 3. (optional) Add API keys — the app runs fully without them
#    GROQ_API_KEY=<your key>   → enables /chat + AI insight panel
#    HF_API_KEY=<your token>   → currently a no-op (see §10.2)
#    Leave DATABASE_URL commented out so the app runs on local SQLite.

# 4. Create the database by ingesting data  (~250k rows; takes minutes)
npm run ingest

# 5. Verify what landed
npm run status
#   Expect: Data points ~252,834 · Indicators 117 with data / 123 total · Countries 217

# 6. Build the TF-IDF index used by /chat retrieval
npm run index-embeddings
#   Expect: 50,000 chunks indexed

# 7. Start the dev server
npm run dev
#   → http://localhost:3000
```

**Verify the install:**
```bash
npm test          # unit + component tests should pass
npm run build     # production build should succeed
```

### 12.3 Data refresh workflow

| Goal | Command |
|---|---|
| Full refresh of everything | `npm run ingest` |
| Refresh one indicator after editing its fetcher | temporarily move `.env.local` aside, run `npm run ingest` (the 24 h `isFresh` guard will skip everything else) |
| Refresh the newest/composite sources | `npm run ingest:new` |
| After any data change, refresh search | `npm run index-embeddings` |
| Check coverage / find gaps | `npm run status` |

> **Note on the 24-hour guard.** `isFresh()` skips any indicator whose
> `MAX(fetched_at)` is under 24 h old. During iterative development you may find your fetcher
> change appears to "not work" because the indicator is considered fresh. Either wait 24 hours,
> or `DELETE FROM data_points WHERE indicator_id = '<id>'` to force a re-fetch.

### 12.4 Running the E2E tests

```bash
# Terminal 1 — the E2E config expects port 3456, NOT the Next.js default 3000
npx next dev --port 3456

# Terminal 2
npx playwright install chromium     # first time only
npx playwright test
```

⚠️ There is **no `webServer` block** in `playwright.config.ts` and **no npm script for E2E** —
you must start the server on port 3456 manually. `fullyParallel: false`, `workers: 1`.

### 12.5 Seeding a fresh PostgreSQL instance

```bash
# 1. Create a new Supabase project; copy its connection string
# 2. Point the app at it (add to .env, uncommitted)
DATABASE_URL=postgresql://…

# 3. Create schema + insert all data directly into PG
npm run ingest

# 4. Build the TF-IDF index inside PG
npm run index-embeddings

# 5. Remove DATABASE_URL from .env so local dev stays on SQLite;
#    set the same value in the Vercel project env vars for production.
```

---

## 13. Deployment

### 13.1 Target platform

| Item | Value |
|---|---|
| Platform | **Vercel** (serverless). `vercel` CLI `^59.16.0` is a devDependency; `AGENTS.md` documents `vercel --prod`. |
| Build command | `npm run build` (Next.js default detection) |
| Start command | `next start` / Vercel default for Next.js |
| Framework preset | Next.js (auto-detected) |
| Domain | **TBD / Not found in codebase** — no domain recorded in any file. |
| `vercel.json` | **Does not exist.** No regions, no crons, no headers, no build config. |
| `.vercel/` | Gitignored; not committed. |
| CI/CD | **TBD / Not found in codebase** — no `.github/`, no GitLab CI, no build hooks config in-repo. Vercel's own Git integration may be configured out-of-band (not visible here). |

### 13.2 Production environment variables

Per `AGENTS.md`: `GROQ_API_KEY` (and, once fixed, a working `DATABASE_URL`) are set in the
Vercel project dashboard. `DATABASE_PATH` is irrelevant in production (no SQLite).

### 13.3 Current deployment status — ⚠️ BLOCKED

This is the single biggest issue in the project and is documented in both `README.md` and
`AGENTS.md`:

1. **The original Supabase Postgres host is dead.** `db.fzibhydljxjqrulwwykp.supabase.co`
   no longer resolves in DNS (`ENOTFOUND`).
2. **The Vercel env vars likely still point at that dead host** (marked "unverified and likely stale").
3. **Any `DATABASE_URL` pointing at it makes every server-rendered page return 500**
   ("Error in Server Components render"), because `getDb()` awaits `runPgMigrations()` against
   an unresolvable host and the promise rejects inside the render.
4. **SQLite is not a viable production fallback on Vercel:** the serverless filesystem is
   ephemeral and `data/*.db` is gitignored, so the database would not exist and would vanish
   on every cold start.

**Consequence:** production is down until a new Supabase project is created, re-seeded with
`npm run ingest` + `npm run index-embeddings`, and the Vercel env vars are updated.

**Local development is unaffected** — `.env` has no `DATABASE_URL`, so the app runs on
`data/india.db` and all pages return 200.

### 13.4 Why SQLite-for-local / PG-for-prod

Documented rationale (README/AGENTS): "Free-first. Local SQLite, free-tier Vercel, free AI APIs
(Groq, HuggingFace)." `src/lib/db/client.ts` exists specifically so the same codebase runs on a
zero-install local file and on serverless Postgres, and so `?`→`$N` placeholder rewriting can be
handled in one place.

---

## 14. Security and Performance

### 14.1 Security posture

**What is done well:**
- **SQL injection is structurally prevented.** Every query is parameterised; `?` placeholders are
  bound, never interpolated. Table/column names in `bulkInsert` come from code constants only.
- **Secrets stay server-side.** `GROQ_API_KEY` / `HF_API_KEY` are read from `process.env` in
  route handlers and `src/lib/ai/client.ts` only — never in a `"use client"` component, so they
  cannot leak into the browser bundle.
- **`.env*` is gitignored** with an explicit `!.env.example` allow, and the committed
  `.env.example` holds only empty placeholders.
- **No user input is ever rendered as raw HTML.** All UI output goes through JSX (auto-escaped).
  There is no `dangerouslySetInnerHTML` anywhere in the codebase.
- **External links are hardened** with `target="_blank" rel="noopener noreferrer"` on every
  historical-event and learn-more link.
- **TypeScript strict mode** with `skipLibCheck` and `noEmit`.

**Gaps:**

| Gap | Impact |
|---|---|
| **No authentication or authorisation** | Everything is public. Acceptable for a read-only dashboard, but any future write feature or per-user data needs auth first. |
| **No rate limiting** | `/api/ai/chat` and `/api/ai/insights` proxy a metered third-party API (Groq) at no cost control. A single actor can exhaust the free quota or rack up charges. **This is the highest-severity practical risk.** |
| **No input validation library** | `zod` is installed but never imported. Query params are checked for truthiness only; `parseInt` results are unvalidated (`?limit=-1`, `?year=abc`, arbitrarily long `?indicator=`). No length caps on `question` or `conversationHistory`. |
| **No security headers** | `next.config.ts` is empty — no CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`. The site is frameable. |
| **Error messages leak internals** | `/api/ai/insights` returns `500 {error: err.message}`; `/api/ai/chat` does the same. DB hostnames and driver errors can surface to the client. |
| **`node:sqlite` experimental** | Emits an `ExperimentalWarning`; the API may change. Suppressed only in npm scripts, not in `next dev`. |
| **No dependency audit** | No `npm audit` / Dependabot config in-repo. `drizzle-orm`, `papaparse`, `xlsx@0.18`, `d3-scale`, `world-atlas` are unused and could be removed to shrink the attack surface. |
| **Sensitive-data classification** | `TBD / Not found in codebase` — no privacy policy, no data-retention statement, no licence file on disk despite README claiming MIT. |

### 14.2 SEO

- **React Server Components by default** → full HTML for every page, indexable without JS.
- `metadata` in `src/app/layout.tsx`: title + description + `icons.favicon.svg`. **No
  `openGraph`, no `twitter` card, no `keywords`, no `alternates.canonical`, no `robots`,
  no `metadataBase`, no sitemap, no `robots.txt`, no JSON-LD structured data.**
- ⚠️ The meta description says "80+ global indicators" — stale (registry has 123).
- `force-dynamic` on `/`, `/compare`, `/rankings`, `/report-card`, `/methodology` means those
  pages are re-rendered per request — good for data freshness, neutral for crawl cost.
- Semantic HTML is used well: one `<h1>` per page, `<table>` with `<thead>`/`<th scope>` on
  Rankings and the indicator top-10, `<details>` for citations, `aria-expanded`/`aria-controls`
  on accordions and the mobile nav, `aria-pressed` on `FlowChips`, `role="group"` + `aria-label`
  on chip rows.
- The `/methodology` page is a strong SEO asset (long-form, source-linked, explains scoring).

### 14.3 Performance work in place

| Technique | Detail |
|---|---|
| **Server-first rendering** | Pages query the DB directly in-process — no HTTP hop, no client waterfall on first paint. |
| **Batched rank computation** | `getLatestRanks()` collapses ~110 per-indicator queries into one window-function query. `/country/[iso3]` went from ~220 round-trips to 6 (per AGENTS.md). |
| **`bulkInsert` with chunking** | 500 rows per statement. AGENTS.md: per-row `execute` loops are ~100× slower on remote PG. |
| **Targeted indexes** | `idx_data_points_indicator_year` and `idx_data_points_country_year` cover the two dominant access patterns (by indicator, by country). |
| **SQLite pragmas** | `journal_mode=WAL` (concurrent read while writing), `synchronous=NORMAL`, `foreign_keys=ON`. |
| **Connection memoisation** | `_sqLite` and `_pgPool` are module-level singletons; migrations run once. |
| **`?`→`$N` rewriting** | Keeps one query string for both engines instead of duplicating SQL. |
| **Client fetch de-duplication** | `Promise.all` across selected countries; `cancelled` flags prevent setState-after-unmount. |
| **Linear chip sorting** | `FlowChips` uses a `Set` for the selected-lookup specifically to avoid O(n²) across 217 countries per keystroke. |
| **`memo` on FlowChips** | Prevents re-render of the whole chip row. |
| **`parallel` vs `sequential` fetch tuning** | World Bank uses a 5-wide pool; OWID generic is deliberately sequential with retries due to upstream throttling on `raw.githubusercontent.com`. |
| **Upstream HTTP caching** | World Bank `fetch` sets `next: { revalidate: 60*60*24 }` (1 day). |
| **`rank` column is unused** | Precomputed ranks were abandoned in favour of window functions — one less write per ingest. |
| **Staleness guard** | 24 h `isFresh()` prevents redundant re-fetching of ~250k rows. |

**Not implemented / notable gaps:**
- **No application-level cache** — no Redis, no in-memory memoisation of query results. Every
  request hits the DB. On serverless PG this means a connection per cold start.
- **No `unstable_cache` / `revalidateTag` / `cache()`** usage in app code.
- **No pagination** on `/rankings` (returns the full country list) or `/api/indicators/leaderboard`
  (`limit` defaults to 30, but the map requests 250).
- **The 50,000-chunk cap truncates the TF-IDF corpus by alphabetical indicator order** — later
  indicators are never indexed, so chat retrieval silently under-covers them.
- **`vectorSearch()` scores all 50,000 chunks in Node on every request** with no index, no
  precomputed norms, and no caching. This is the heaviest endpoint by far and is not rate-limited.
- **`getLatestRanks` scans all data_points** via the `latest` CTE before filtering to the
  requested ids — the window function is computed over the whole table, not the subset.

---

## 15. Testing

### 15.1 Unit & component tests (Vitest) — `npm test`

**Setup:** `vitest.config.ts` — `environment: "jsdom"`, `globals: true`,
`setupFiles: ["./src/test/setup.ts"]` (which is just `import "@testing-library/jest-dom/vitest"`),
`include: ["src/**/*.{test,spec}.{ts,tsx}"]`, `@` → `src` alias.

**7 test files** (co-located next to the code they test):

| File | Subject |
|---|---|
| `src/lib/report-card.test.ts` | `indicatorScore`, `average`, `gradeFor`, `prevValueInSeries` |
| `src/lib/rankings.test.ts` | `competitionRank`, `computeRankings`, `computeRankHistory`, `rankDelta`, percentile maths, tie handling |
| `src/lib/format.test.ts` | `fmtValue`, `fmtCompact` — thresholds, null handling, unit suffixing (8 cases added in commit `1b29d85`) |
| `src/components/dashboard/scatter-chart.test.tsx` | `ScatterCard` with mocked `fetch` and a stubbed `ResponsiveContainer` |
| `src/components/dashboard/country-trend-card.test.tsx` | `CountryTrendCard` dual-series fetching |
| `src/components/ui/flow-chips.test.tsx` | selected-to-front ordering, `onToggle`, `aria-pressed`, `sortSelectedFirst`, `showCheck` |
| (aggregated in the above) `/api/scatter` route | route handler with a **mocked DB** |

**Latest count:** 51 passing tests (per the latest subagent verification; `AGENTS.md` records 41
at commit `1b29d85`). **No coverage tooling is configured** — no `c8`/`istanbul`, no
`--coverage` flag, no thresholds. Coverage % is therefore unknown.

**Notable testing decision:** the pure logic modules (`report-card.ts`, `rankings.ts`,
`rank-direction.ts`, `format.ts`) are deliberately DB-free so they can be unit-tested. This is
called out in the file headers: *"Pure helpers … (no DB access — easily unit tested)."*

### 15.2 E2E tests (Playwright) — `npx playwright test`

Not in `package.json`; run manually. Requires a dev server already on `:3456`.

**`e2e/flows.spec.ts` — 7 numbered critical-journey tests:**
1. Home `/` — H1 contains "How is India performing", exactly **12** KPI buttons
   (`button[title="Click for year-wise trend"]`), stats line + footer render, **no** "Application
   error", **no** `digest` marker, zero console errors, zero page errors. Saves `home.png`.
2. `/explore` — click `economy` tab → "Agriculture, value added (% GDP)" visible and
   "Human Development Index" hidden; reset to All; search "infant"; click through to
   `/indicator/infant_mortality`.
3. `/compare` — waits for a 200 from `/api/indicators/series`; asserts default selection
   (India has `bg-blue-500`, "5 selected ·"), indicator defaults to `gdp_current_usd`,
   "Data table" and "AI insight" visible, Recharts wrapper rendered.
4a. `/indicator/ai_readiness` — renders even with no data (proves no crash on an empty indicator).
4b. `/indicator/infant_mortality` — **lower-is-better** trend: cross-checks the expected label
    and colour against a value computed **directly from SQLite** (`computeExpectedTrend` in
    `helpers/db.ts`), asserts `lucide-trending-down` icon + red colour.
4c. `/indicator/internet_penetration` — **higher-is-better** counterpart.
5. `/country/IND` — H1 "India", "Overall global score:", "Top performers", "Bottom performers",
   economy category section present, no error overlay.
6. `/rankings?indicator=gdp_current_usd` — waits for `/api/rankings`, asserts column headers,
   the "India rank" card, India's row contains "You" and has `bg-amber-50`, column sort works,
   country search filters.
7. `/report-card` — overall grade block, first accordion open, toggles a collapsed one and
   asserts indicator links resolve to `/indicator/*`.

**`e2e/health.spec.ts`** — a health sweep over `CRITICAL_PATHS` (from `helpers/pages.ts`):
asserts no Next.js dev error overlay, no `digest`, no unhandled page errors, no unexpected
console errors; plus a DB sanity test (`getCountryCount() > 0`,
`getIndicatorName("infant_mortality") === "Infant mortality rate"`). Prints a summary table
in `afterAll`.

**Helpers:**
- `e2e/helpers/health.ts` — `installCollectors(page)` (console + pageerror capture),
  `checkPageHealth()` (overlay dialog + digest regex), `unexpectedConsoleErrors()` (allowlist-filtered), `formatHealth()`.
- `e2e/helpers/db.ts` — reads `data/india.db` **directly** via `node:sqlite` to compute
  ground truth (`computeExpectedTrend`, `getCountryCount`, `getIndicatorName`). This is a strong
  pattern: the E2E suite verifies the UI against the database rather than against itself.
- `e2e/helpers/pages.ts` — `CRITICAL_PATHS`.

**Strong quality signal:** the suite asserts **zero console errors and zero page errors** on
every critical page, which is why the AGENTS.md cleanup commits chase duplicate React keys and
hydration mismatches.

### 15.3 What is missing

| Gap | Detail |
|---|---|
| **No coverage measurement** | No `c8`/`istanbul` config or threshold. |
| **No DB-integration tests** | No test exercises `src/lib/db/client.ts`, `queries.ts`, or any SQL. `runSqliteMigrations`/`runPgMigrations` are untested. |
| **No ingestion tests** | No fixtures/mocks for the 14 source fetchers. A broken fetcher is only discovered by reading `npm run ingest` console output. |
| **No AI-layer tests** | `/api/ai/chat` (248 lines, the most complex route) has no unit test — not for context building, not for citation extraction, not for the Groq-missing fallback. |
| **PG path untested** | The `DATABASE_URL` branch, `pgSql()` rewriting, and `bulkInsert` chunking against PG are never exercised by tests (and cannot be, given the dead host). |
| **E2E not in CI** | No CI config exists; E2E needs a manually started server on a non-default port. |
| **No accessibility tests** | No `axe` / `jest-axe`. ARIA is used carefully by hand but unverified. |
| **Visual regression** | Screenshots are saved on failure only, never compared. |
| **No load/performance tests** | The heaviest endpoint (`vectorSearch` over 50k chunks) is untested under load. |

---

## 16. Known Issues, Limitations, and Technical Debt

Ordered roughly by severity. Items marked **[repo-self-documented]** are also recorded in
`AGENTS.md`/`README.md`.

### 16.1 Blocking

| # | Issue | Evidence | Impact |
|---|---|---|---|
| 1 | **Production is down — dead Supabase host** **[repo-self-documented]** | `db.fzibhydljxjqrulwwykp.supabase.co` no longer resolves (`ENOTFOUND`); Vercel env vars unverified and likely stale | Every server-rendered page 500s in production. Requires: new Supabase project → `npm run ingest` with `DATABASE_URL` → `npm run index-embeddings` → update Vercel env. |
| 2 | **No viable production database** | SQLite is unusable on Vercel (ephemeral FS + `data/*.db` gitignored) | Production cannot ship until #1 is fixed. There is no documented fallback (e.g. Turso/libSQL, Neon, PlanetScale). |

### 16.2 Bugs

| # | Issue | Location | Impact |
|---|---|---|---|
| 3 | **`npm run migrate-pg` is broken** | `package.json` → `scripts/migrate-to-pg.ts`; the file on disk is `scripts/migrate-to-pg.mjs` | The command fails immediately. The documented SQLite→PG migration path cannot be executed as shipped. |
| 4 | **`/api/ai/insights` throws at module scope without a key** | `const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })` at line 5 | Route 500s opaquely when `GROQ_API_KEY` is unset — the opposite of `/api/ai/chat`'s graceful degradation. Inconsistent. |
| 5 | **`npm run ingest:wb` ignores its argument** | `scripts/ingest.ts` never reads `process.argv` | Running it performs a **full** ingestion of all 33 sources, not just World Bank. Misleading name; risks a long accidental run. |
| 6 | **Misleading "World rank of India" card** | `src/app/indicator/[id]/page.tsx` — `indiaRow ? '#' + (leaderboard.findIndex(...) + 1)` where `leaderboard = getLeaderboard(id, year, 10, …)` | The rank is computed from a **limit-10** list, so the displayed value is always ≤ 10 regardless of India's true global rank. The adjacent "Global rank" card (which uses `getRankInYear`) is correct. Contradictory numbers on the same screen. |
| 7 | **`/country/IND` radar compares India to itself** | `src/app/country/[iso3]/page.tsx` — `getLatestRanks(ids, [code, "IND"])` | When `code === "IND"` both radar series are identical, producing a degenerate radar with two overlapping lines. Should special-case India. |
| 8 | **TF-IDF corpus truncates alphabetically** | `scripts/index-embeddings.ts` — `points.slice(0, 50000)` after `ORDER BY indicator_id, country_iso3, year` | Indicators late in alphabetical order are never indexed, so `/chat` retrieval silently cannot answer questions about them. ~203k of 252k data points are excluded. |
| 9 | **No `webServer` in Playwright config + wrong port** | `playwright.config.ts` `baseURL: "http://localhost:3456"`, no `webServer` | E2E cannot self-start; requires a manually started server on a non-default port. Not runnable in CI. |
| 10 | **Windows-only npm scripts** | `set NODE_OPTIONS=--no-warnings&& tsx …` (5 scripts) | `set` without `/p` or `export` does not set env vars in `sh`/`bash`, so `NODE_OPTIONS` is silently dropped on macOS/Linux and the `node:sqlite` experimental warning floods output. Blocks POSIX CI. |

### 16.3 Hardcoded values & config drift

| # | Issue | Location |
|---|---|---|
| 11 | **Hardcoded peer country sets in 6 places** | `page.tsx` `COMPARISON_COUNTRIES` (IND/USA/CHN/BRA/ZAF) · `indicator/[id]` `COMPARE_COUNTRIES` · `comparison-tool.tsx` `DEFAULT_COUNTRIES` · `report-card.tsx` `PEER = "CHN"` · `/api/ai/chat` SQL `IN ('IND','USA','CHN','BRA','ZAF')` · `/api/ai/chat` `isoMap` (10 names). Should be one shared constant. |
| 12 | **Hardcoded country list only in `ingest-new.ts`** | `FOCUS_COUNTRIES` (30 countries) — `ingest.ts` uses `[]` (all countries). Inconsistent data breadth between the two ingest paths. |
| 13 | **Trend "flat" threshold is inconsistent** | home `< 0.5%` · country page `< 0.5%` · report card `< 0.1%` — three different values for the same concept. |
| 14 | **Two different percentile formulas** | `rankings.ts`: `((total-rank)/(total-1))*100` (last = 0). `report-card.ts`: `((total-rank+1)/total)*100` (last ≈ 1). Both presented to users as "percentile". |
| 15 | **`page.tsx` still has local formatters** | `fmtBig()` and `fmtPlain()` in `src/app/page.tsx` duplicate `src/lib/format.ts`'s `fmtValue`/`fmtCompact`. The DRY refactor in `1b29d85` never reached this file. |
| 16 | **`data_points.rank` is dead** | Column declared in both schemas, never written, never read. |
| 17 | **`owid` missing from the `sources` table** | `scripts/ingest.ts` `SOURCES[]` omits `owid` although 3 indicators declare `source: "owid"`. The home-page footer (`sources.map(...).join(", ")`) therefore never lists OWID despite it being a major source. |
| 18 | **`sources.type` union vs seeded values** | `Source["type"]` in `types.ts` allows `api \| csv \| pdf \| scrape`, but `SOURCES[]` only ever emits `api` or `pdf`. `csv`/`scrape` are undeclared reality. |
| 19 | **Stale counts across docs** | README/AGENTS: 120 indicators, 105,740 points, 34 sources, 20 zero-point. Live DB: **123 / 252,834 / 33 / 6**. Layout metadata: "80+ global indicators". Methodology page: "118+ indicators, 250k+ data points". |
| 20 | **Methodology page claims "25+ such indicators"** | `src/app/methodology/page.tsx` `SCORING[5].detail` — `rank-direction.ts` actually has **37**. Understated. |

### 16.4 Unused dependencies & dead code

| Dependency | Status |
|---|---|
| `drizzle-orm` `^0.45.2` + `drizzle-kit` `^0.31.10` | **0 source references, no `drizzle.config.*`, no schema files.** Pure dead weight — all SQL is hand-written. |
| `zustand` `^5.0.14` | **0 references.** README says "ready when we need client state". |
| `zod` `^4.4.3` | **0 references.** No runtime validation anywhere. |
| `papaparse` `^5.5.4` | **0 references** — CSV parsed by hand. |
| `d3-scale` `^4.0.2` | **0 references** — colour ramp hand-rolled. |
| `world-atlas` `^2.0.2` | **0 references** — `public/world-110m.json` is committed instead. |
| `@types/better-sqlite3` | Wrong tool — the project uses `node:sqlite`, not `better-sqlite3`. |
| `next-themes` `^0.4.6` | 1 reference; no `ThemeProvider` mounted, no theme toggle. |
| `sonner` `^2.0.7` | `ui/sonner.tsx` exists but `<Toaster/>` is never rendered. |
| `scripts/check-remaining.cjs` + `check-remaining.js` | Ad-hoc debris, not referenced by any script; `.cjs` and `.js` are duplicates. |
| `src/components/ui/dialog.tsx`, `select.tsx`, `tabs.tsx`, `separator.tsx`, `input.tsx`, `label.tsx`, `stat-card.tsx` | shadcn-generated; several appear unused by any page. |
| `public/{next,vercel,globe,file,window}.svg` | Create-Next-App / Vercel template leftovers. |
| `dev-server.log`, `tsconfig.tsbuildinfo` | Stray artefacts committed to the working tree (gitignored but present). |
| `/api/ai/insights` | ⚠️ **No UI calls it.** `comparison-tool.tsx` posts to `/api/ai/chat`, not `/api/ai/insights`. Effectively an orphan endpoint. |
| `src/lib/ai/embeddings.ts` | 0 call sites (see #8 in §10.2). |
| `generateInsight()` in `src/lib/ai/client.ts` | Exported from the barrel; 0 call sites. |
| `isHigherBetter` in `/api/scatter` | Not imported there — `/api/scatter` does not do direction-aware scatter colouring. |
| `LICENSE` file | **Does not exist**, though README says "MIT". |

### 16.5 Partial features

| Feature | What's missing |
|---|---|
| **Indicator guides** | `src/lib/indicator-guides.ts` has ~68 hand-written guides for a **123**-indicator registry — roughly **55 indicators fall back to generic text**, so "In simple words" / "How is it calculated?" are generic for ~45% of indicators. |
| **Dark mode** | Tokens + `dark:` classes + `@custom-variant dark` all exist, but there is no `ThemeProvider` in `layout.tsx` and no toggle component. Dark mode is currently unreachable for users. |
| **Toasts** | `ui/sonner.tsx` never mounted. |
| **HuggingFace embeddings** | Implemented, never invoked; `embeddings.embedding` holds TF-IDF, not vectors. Column name is actively misleading. |
| **Auth / users** | README "⏳ next". No code. |
| **6 zero-point indicators** | `broadband_speed`, `ccpi`, `digital_competitiveness`, `epi`, `qs_rank`, `startup_ecosystem` have no fetcher, so the registry advertises 123 indicators while the UI can only show 117. AGENTS.md documents why each source is unusable (PDF-only, paid, discontinued, or no open CSV/API). |
| **CLI hygiene** | `npm test` covers Vitest only; there is no `npm run e2e`, no `npm run lint && npm test` aggregate, no `typecheck` script (`tsc --noEmit` is not exposed as a script). |

### 16.6 Missing TODO/FIXME markers

A repo-wide search for `TODO`/`FIXME`/`HACK`/`XXX` comments returned **none**. Intentional
incompleteness is instead documented narratively in `AGENTS.md` ("Remaining", "Known issues /
deployment status") and in `README.md` ("Next steps (the plan)"). The trade-off is that nothing
is discoverable from the code itself.

### 16.7 Architectural risks

| Risk | Detail |
|---|---|
| **Single-writer design** | Only `scripts/*.ts` write. If the DB is lost (as it would be on Vercel), the entire dataset must be re-fetched from 33 external sources — which are **not versioned, not snapshotted, and several are already discontinued** (Doing Business 2021, WEF GCI 2019). Data is not reproducible. |
| **Two schema definitions** | SQLite and PG DDL are hand-duplicated. They have already drifted (`REAL` vs `DOUBLE PRECISION`, `TEXT` vs `TIMESTAMP DEFAULT NOW()`) and there is no test asserting they stay equivalent. |
| **No migrations framework** | Additive `IF NOT EXISTS` only. Any column change needs manual DDL on both engines. |
| **`getLatestRanks` full scan** | The `latest` CTE computes window functions across all 252k rows before filtering to the requested ids. Works at this size; will degrade as the dataset grows. |
| **TF-IDF at query time** | 50k cosine similarities per chat request, in Node, uncached, unindexed, unauthenticated, unrate-limited. |
| **No test coverage on the DB layer** | A refactor to `queries.ts` could silently break every page with no test failure. |
| **Dependence on the TF-IDF cap ordering** | Fixing #8 requires re-running indexing; until then, chat answers will be unevenly grounded across indicators. |

---

## 17. Future Enhancements

Grouped as **explicitly planned** (documented in `README.md`/`AGENTS.md`) vs **logically implied
by the code**.

### 17.1 Explicitly planned

| # | Enhancement | Source |
|---|---|---|
| 1 | **Fix the production DB story** — create a new Supabase project, re-seed, update Vercel env vars | README "Next steps" #1 |
| 2 | **Repair `npm run migrate-pg`** — rename `migrate-to-pg.mjs` → `.ts` (or fix the script) | This audit (§16.2 #3) |
| 3 | **Source the remaining zero-point indicators** where any open source exists | README "Next steps" #2 |
| 4 | **Auth / users** | README table: "⏳ next" |
| 5 | **Improve the AI layer** — integrate more source documents, "move to Claude when traffic warrants" | README "Next steps" #4 |

### 17.2 Logically implied

**Correctness & data integrity**
6. Finish `indicator-guides.ts` so all 123 indicators have a real plain-language guide.
7. Fix the misleading "World rank of India" card to use `getRankInYear` (consistent with the adjacent card).
8. Fix `/country/IND`'s self-comparison radar.
9. Replace the alphabetical 50k TF-IDF slice with a stratified/round-robin sample so all indicators are indexed.
10. Add `owid` to `SOURCES[]`; align `sources.type` with reality (`csv`, `scrape`).
11. Either populate `data_points.rank` or drop the column.
12. Reconcile the three "flat trend" thresholds and the two percentile formulas into shared helpers.
13. Delete `data_points.rank`'s ghost and rename `embeddings.embedding` → `tfidf_vector` (or actually use dense embeddings).
14. Update README/AGENTS/layout-metadata/methodology counts to the live DB numbers.

**Engineering quality**
15. Adopt `zod` for real request validation on all 6 routes (it's already installed).
16. Add rate limiting to `/api/ai/chat` and `/api/ai/insights` — the highest-value security fix.
17. Stop leaking raw `err.message` in 500 responses.
18. Add security headers (CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`) in `next.config.ts`.
19. Extract a single `PEER_COUNTRIES` constant; delete the 6 hardcoded copies.
20. Replace `page.tsx`'s local `fmtBig`/`fmtPlain` with `fmtValue`/`fmtCompact`.
21. Read `process.argv` in `ingest.ts` so `ingest:wb` actually filters to World Bank.
22. Make the npm scripts POSIX-compatible (`cross-env` or plain `NODE_OPTIONS=… tsx`).
23. Add npm scripts: `typecheck` (`tsc --noEmit`), `e2e`, `verify` (lint + typecheck + test + build).
24. Add a `webServer` block to `playwright.config.ts` on port 3000 so E2E runs unattended.
25. Add coverage (c8/istanbul) with a threshold, plus DB-layer and `/api/ai/chat` tests.
26. Remove the 7 unused dependencies (§16.4) and the `check-remaining.*` debris.
27. Deduplicate the hand-written SQLite/PG DDL behind one schema definition.

**Performance & scale**
28. Move RAG retrieval off the request path: precompute norms, add an inverted index, or cache the 50k-vector matrix in module scope / a warm lambda.
29. Add `unstable_cache` / `revalidateTag` around the heavy read queries.
30. Push `getLatestRanks`' `latest` CTE to operate only on the requested indicator ids.
31. Move ingestion off SQLite-only onto a real Postgres/Turso/libSQL so local and prod share one engine and the dataset is reproducible.

**Product**
32. Wire `next-themes` into `layout.tsx` and add a theme toggle — the CSS is already done.
33. Mount `<Toaster/>` so the existing `sonner` component is usable.
34. Consolidate `/api/ai/insights` into the shared `chat()` helper and either surface it in the UI or delete it.
35. Add an Open Graph/Twitter card, `metadataBase`, canonical URLs, `sitemap.ts`, `robots.ts`, and JSON-LD `Dataset` structured data — the dataset is a natural fit for `schema.org/Dataset` and would materially help SEO.
36. Add a data-freshness badge ("last updated …") driven by `MAX(fetched_at)` — the schema already tracks it per point but no UI surfaces it.
37. Add automated/periodic re-ingestion (Vercel cron or GitHub Actions) so the site self-refreshes.
38. Watchlists / saved comparisons / shareable permalinks — the natural first feature behind auth.
39. Add the 6 missing indicators' data, or hide zero-data indicators from `/explore` and the Rankings selector (currently they are listed and render empty states).
40. Add a `LICENSE` file (README claims MIT).
41. Add an `AGENTS.md`/`CLAUDE.md` note that the repo has no in-code TODO markers, so future work should be tracked there.

---

## 18. Development History

> ⚠️ `AGENTS.md` references a specific commit (`1b29d85` on `origin/master`) but **the
> working copy here is not a git repository** (no `.git/` directory), so `git log` could not be
> run. The timeline below is **inferred** from `AGENTS.md`'s "Completed"/"Remaining"/"Known
> issues" sections, the `README.md` feature table, and code-level evidence. Exact dates, authors,
> and commit SHAs are **`TBD / Not found in codebase`**.

### 18.1 Inferred milestones

| Phase | Milestone | Evidence in code |
|---|---|---|
| **1. Foundation** | Next.js 16 + TS strict + Tailwind v4 + shadcn scaffolded; `next.config.ts` left at defaults | Empty `next.config.ts`, default `globals.css` shadcn token block, CRA leftovers in `public/` |
| **2. Data layer** | Hand-rolled DB abstraction with SQLite-first design; `queries.ts` established as the single SQL home | `src/lib/db/client.ts` header, `queries.ts` structure |
| **3. World Bank first** | Chosen as the starting source — highest coverage, no auth | README: "We started with World Bank because it's the highest-coverage, no-auth source." All other fetchers follow the same shape |
| **4. Registry pattern** | The 123-indicator registry in `indicators.ts` became the extension point: add an entry, and ingestion picks it up | `INDICATORS[]` + `getAvailableIndicators()` + `READY_SOURCES` |
| **5. Source expansion** | Grew from World Bank → +UNDP, WHO, OWID, WGI, TI, UN, Numbeo → +7 composite indices (INFORM, WIPO GII, IEP GPI, Yale EPI, Portulans NRI, Oxford AIRI, SPI) → +OWID extras, SDG, archived Doing Business | `sources/` grew to 14 files; `SOURCES[]` to 33 |
| **6. Pages** | Home → Explore → Indicator → Country → Compare → Rankings → Report Card → Methodology → Chat | 9 pages in `src/app/` |
| **7. PostgreSQL migration** | `client.ts` gained `isPg()`, `pgSql()` `?`→`$N`, `runPgMigrations()`, `bulkInsert()`; all DB calls made async | Documented as "Completed" in AGENTS.md; `pg` dependency added |
| **8. Performance work** | `getLatestRanks()` batching cut `/country/[iso3]` from ~220 round-trips to 6; `bulkInsert` replaced per-row loops (~100× on PG) | Doc comments in `queries.ts` and `client.ts` |
| **9. PG cut-over → failure** | Production moved to Supabase PG. That host has since died (`ENOTFOUND`), so pages 500 in production | README ⚠️ banner, AGENTS.md "Known issues / deployment status" |
| **10. Rollback to SQLite locally** | `.env` had `DATABASE_URL` removed so local dev works again; SQLite at `data/india.db` | AGENTS.md: "`.env` no longer contains `DATABASE_URL`" |
| **11. Explainer layer** | `indicator-guides.ts` and `historical-events.ts` added — plain-language explanations, calculation methods, and Indian historical events with proof URLs | Both files, and their use in `indicator/[id]/page.tsx` and `/api/ai/chat` |
| **12. Methodology page** | `/methodology` added to make the scoring transparent and self-verifiable | 6-step `SCORING[]`, `SOURCES[]`, caveats |
| **13. Test suite** | Vitest 4 + Testing Library (jsdom) established → grew 16 → 41 tests across 6 files; later 51 across 7 | `AGENTS.md` ("16 passing tests at the time (now 41 …)") and the latest verification |
| **14. E2E hardening** | Playwright suite added with **zero console/page-error assertions**, error-overlay + digest detection, and DB-truth cross-checks | `e2e/flows.spec.ts`, `e2e/health.spec.ts`, `helpers/db.ts` |
| **15. Cleanup pass** (`1b29d85`) | Removed the dead Supabase URL; DRY'd `fmtValue` into `src/lib/format.ts` (replacing 5 local copies); added `higherBetter` to `getRankInYear`/`getLeaderboard`; **fixed trend-icon direction**; fixed an explore nested-anchor bug; added 8 `format.test.ts` cases | AGENTS.md "Recent cleanup"; `trend-chart.tsx` unique-key fix |
| **16. Latest indicator additions** | `patents_per_million` (OWID grapher) and `innovation_idx` (WIPO GII xlsx) added to the registry, taking it 120 → **123**; zero-point indicators dropped 20 → **6**; data points grew ~105,740 → **252,834** | Live DB (§6.6) vs README/AGENTS counts |
| **17. Animation pass** | `motion@^14` added and `FlowChips` introduced with spring FLIP layout, plus `flow-chips.test.tsx` and the linear-Set optimisation comment | `src/components/ui/flow-chips.tsx`, `package.json:32` |

### 18.2 Key architectural decisions (and their recorded rationale)

| Decision | Rationale (from README/AGENTS/comments) |
|---|---|
| **Server Components first** | "Pages fetch data on the server, send only the shape the client needs. First paint is fast and SEO-friendly." |
| **One DB layer, auto-detecting driver** | "One DB layer. `queries.ts` is the *only* place that knows SQL, and `client.ts` auto-detects the driver." |
| **One indicator registry** | "Add an indicator there and the ingestion script picks it up automatically." |
| **Free-first** | "Local SQLite, free-tier Vercel, free AI APIs (Groq, HuggingFace). We pay for a domain and, later, Claude API." |
| **Local TF-IDF instead of a hosted vector DB** | "Local TF-IDF vector search — no external API needed." Avoids a paid vector store and makes the AI layer work offline. |
| **Percentile-based scoring, not raw values** | Methodology step 4: "so a low raw value can still earn a good grade if it beats most countries." |
| **Categories equally weighted** | Overall score = average of *category* averages, so a 22-indicator category doesn't dominate a 5-indicator one. |
| **Every claim carries a proof URL** | `historical-events.ts` header: "Each event carries a `source` (URL) so every claim is verifiable." |
| **`bulkInsert` always, for remote PG** | AGENTS.md: "ALWAYS use it for bulk writes to remote PG (per-row `execute` loops are ~100x slower)." |
| **OWID fetched sequentially** | `owid-generic.ts` comment: parallel bursts to `raw.githubusercontent.com` get throttled. |
| **Competition ranking with shared ranks** | `rankings.ts`: "equal values share the best rank (1,2,2,4)". Methodology step 3 documents this as a deliberate choice. |

### 18.3 Contributors

**`TBD / Not found in codebase`** — no `package.json` `author`/`contributors` field, no
`AUTHORS`/`CONTRIBUTORS` file, and no `.git` history in this working copy.

---

## 19. Screenshots / Diagrams Needed

### 19.1 Screenshots to capture for the final documentation

| # | Screen | Route | What to show | Priority |
|---|---|---|---|---|
| 1 | Home — full page | `/` | Header stats line, all 12 KPI cards with trend arrows, world map, scatter chart, trend charts, GDP leaderboard, footer | **Critical** (hero shot) |
| 2 | Home — KPI grid close-up | `/` (crop) | The 12 cards, India highlighted, source year + trend % legible | **Critical** |
| 3 | World map — choropleth | `/` (crop) | India coloured, hover tooltip visible, legend gradient, year selector | **Critical** |
| 4 | Scatter correlation | `/` (crop) | Two indicators, India labelled, Pearson *r* + percentile chips | High |
| 5 | Explore — all indicators | `/explore` | Category tabs, search box, card grid with coverage stats (data points / countries / year range) | **Critical** |
| 6 | Explore — category filtered | `/explore?category=economy` | Active tab state, economy-only cards | Medium |
| 7 | Indicator detail — full | `/indicator/hdi` | Header badges (category, source, unit, "↑ higher is better"), 4 stat cards, "In simple words", "How is it calculated?", trend chart, historical events with proof links, top-10 table, learn-more links, related indicators | **Critical** |
| 8 | Indicator detail — lower-is-better | `/indicator/infant_mortality` | "↓ lower is better" badge, green-coloured **downward** trend (shows direction awareness) | **Critical** |
| 9 | Country profile — India | `/country/IND` | Grade badge, overall score, radar, top/bottom performer cards, category panels with sparklines | High |
| 10 | Country profile — a peer | `/country/CHN` | Same layout, different scores — radar now shows two distinct series | High |
| 11 | Compare — default | `/compare` | Country chips selected, line chart, bar chart, radar, data table, AI insight panel | **Critical** |
| 12 | Compare — AI insight expanded | `/compare` (after clicking "AI insight") | Groq-generated insight with citations | High |
| 13 | Rankings | `/rankings?indicator=gdp_current_usd` | Full sortable table, India's row with "You" badge and amber highlight, India rank/percentile/delta cards, rank-over-time chart | **Critical** |
| 14 | Report card — top | `/report-card` | Overall A–F grade block, strongest/weakest badges, India-vs-China radar | **Critical** |
| 15 | Report card — expanded section | `/report-card` (accordion open) | Category indicators with rank, value, trend | High |
| 16 | Report card — CSV export | browser download | The exported `india-report-card-<year>.csv` opened in a spreadsheet | Medium |
| 17 | Chat — conversation | `/chat` | Asked question, Groq answer, expanded "N sources" citation list with `open ↗` links | **Critical** (shows the RAG) |
| 18 | Chat — suggestion chips | `/chat` (initial state) | The 4 starter prompts | Medium |
| 19 | Methodology | `/methodology` | Source cards, the 6-step scoring pipeline, "how to read the charts", caveats | High |
| 20 | Mobile nav open | any page @ <768px | The `Menu`/`X` dropdown | Medium |
| 21 | Dark mode | any page | **Currently unreachable** (§16.5) — capture only after §17.2 #32 is done | Low |

### 19.2 Diagrams to produce

**Already produced as Mermaid in this document (ready to render):**
- §4.4 — system architecture flowchart
- §4.5 — request/data-flow sequence diagram
- §4.6 — ingestion flowchart
- §4.7 — AI chat (RAG) flowchart
- §6.4 — ER diagram

**Still to produce:**

| # | Diagram | Type | Notes |
|---|---|---|---|
| 1 | **Data-pipeline flow: 33 sources → registry → DB** | flowchart / Sankey | Source families (WB / UNDP / WHO / OWID / xlsx / scrape) converging on `data_points`. Currently only implied by §4.6. |
| 2 | **Indicator registry map** | treemap or sunburst | 123 indicators grouped by the 10 categories, sized by data-point count, greyed for the 6 zero-point ones. Strong "coverage at a glance" visual. |
| 3 | **Scoring pipeline** | flowchart | Data point → per-country latest → rank → `indicatorScore` → category `average` → overall `average` → `gradeFor`. Visualises §9.2. |
| 4 | **Direction-awareness** | two-column comparison | Left: higher-is-better (GDP, HDI, life expectancy). Right: lower-is-better (mortality, Gini, CO₂, corruption). Shows how arrows/rank order/grades flip. |
| 5 | **CI/CD + deployment target state** | flowchart | Git → Vercel build → serverless functions → Supabase PG; plus the `npm run ingest` seeding path into PG. Illustrates the fix for §16.1. |
| 6 | **Page/component hierarchy** | component diagram | RootLayout → SiteNav → 9 pages → their client islands → shared `ui/` primitives. |
| 7 | **Test coverage map** | bar or matrix | Which modules have unit tests vs which are untested (§15.3). Makes the testing gap legible. |
| 8 | **Roadmap timeline** | gantt | §17 enhancements, with the unblock-Production item first and critical-path. |

### 19.3 Content to capture

- A **data-freshness note** — the newest year per source (e.g. GDP ≈ 1 year old, HDI ≈ 2 years old), which the methodology page already warns about in prose.
- The **`npm run status` output** — a real terminal screenshot is the most credible coverage proof.

---

## 20. Glossary and Quick Facts

### 20.1 Glossary

| Term | Meaning in this project |
|---|---|
| **AI Readiness Index (AIRI)** | Oxford Insights index of a government's readiness to adopt AI, 0–100. |
| **CCPI** | Climate Change Performance Index (Germanwatch). Rank-based; **lower is better**. |
| **Competition ranking** | Ranking where ties share the best rank: 1, 2, 2, 4. Used everywhere; documented in `src/lib/rankings.ts`. |
| **DATA360** | World Bank's data platform; the EGDI CSV for e-government data is fetched from it. |
| **DIG/EGDI** | E-Government Development Index (UN E-Government Survey), 0–1. |
| **Doing Business** | World Bank's regulatory-quality index, discontinued 2021. Data archived; India 2014–2020. |
| **EPI** | Environmental Performance Index (Yale), 0–100. |
| **FOCUS_COUNTRIES** | Hardcoded country list. Empty in `ingest.ts` (= all countries); 30 entries in `ingest-new.ts`. |
| **GII** | Global Innovation Index (WIPO). |
| **GNIPC / GNI** | Gross National Income per capita, PPP (UNDP). |
| **GPI** | Global Peace Index (IEP), 1–5. |
| **GPI (World Bank)** | *Note the collision:* `global_peace` is IEP's GPI; "GPI" in World Bank parlance is Gross Domestic Product per capita. The code uses `gdp_per_capita`. |
| **Grade (A–F)** | Letter grade derived from a percentile-based 0–100 score: A ≥ 85, B ≥ 70, C ≥ 55, D ≥ 40, F < 40. |
| **GRSN / EPI** | Yale EPI is fetched from a GRSN-hosted release. |
| **HDI** | Human Development Index (UNDP), 0–1: life expectancy + education + income. |
| **IHDI** | Inequality-adjusted HDI — HDI discounted for inequality. |
| **IMD DCR** | IMD Digital Competitiveness Ranking (paid source; no data). |
| **INFORM** | INFORM Risk Index (HDX/JRC) — disaster risk, 0–10. |
| **Indicator** | A single named metric tracked over time per country. 123 registered, 117 with data. |
| **Indicator guide** | `{simpleWords, calculation, learnMore[]}` plain-language explainer for an indicator. |
| **ISO3 / ISO2** | 3-letter (`IND`) / 2-letter (`IN`) country codes — the primary key everywhere. |
| **Lower is better** | 37 indicators where a smaller number is better. Encoded in `LOWER_IS_BETTER`. |
| **NRI** | Network Readiness Index (Portulans Institute), 0–100. |
| **ODIN** | Open Data Inventory (Open Data Watch), 0–100. |
| **OKLCH** | Perceptually-uniform colour space used for every Tailwind v4 theme token. |
| **Percentile score** | `indicatorScore`: `((total − rank + 1) / total) × 100`, so the best country gets 100. |
| **PISA** | OECD Programme for International Student Assessment. |
| **Poverty line** | `$2.15/day` international poverty line (`poverty_215`). |
| **PPP** | Purchasing Power Parity — GDP converted at PPP exchange rates for real living-standard comparison. |
| **RAG** | Retrieval-Augmented Generation: fetch relevant chunks, then ask an LLM to answer only from them. |
| **RCP (WGI)** | Worldwide Governance Indicators — `gov_effectiveness`, `political_stability`, `regulatory_quality`, `voice_accountability`, `control_corruption`, each −2.5 to +2.5. |
| **RSC** | React Server Component — renders on the server, no client JS shipped for that component. |
| **SDG score** | Sustainable Development Goals transformation score (SDSN). |
| **SPI** | Social Progress Index (Social Progress Imperative), 0–100. |
| **Staleness / `isFresh`** | 24-hour guard: if `MAX(fetched_at)` for an indicator is < 24 h old, ingestion skips it. |
| **TF-IDF** | Term Frequency–Inverse Document Frequency. The actual retrieval mechanism behind `/chat`. |
| **Tie handling** | Ties share a rank; the denominator `total` is always the count of countries with data. |
| **Trend / improving** | *Trend* = raw direction of change. *Improving* = direction interpreted through `isHigherBetter`. Two different things, deliberately distinguished. |
| **UHC** | Universal Health Coverage — WHO's service-coverage index, 0–100. |
| **UNDP HDR** | Human Development Report — UNDP's annual flagship; the CSV source for HDI-family indicators. |
| **WGI estimate** | −2.5 (very weak) to +2.5 (very strong) governance score. |
| **World Bank aggregate** | Rows like `WLD`, `HIC`, `ECS` — filtered out during ingestion (`region.id !== 'NA'`). |

### 20.2 Project statistics

**Codebase (measured, 2026-10-04)**

| Metric | Count |
|---|---|
| `.ts` / `.tsx` source files (excl. `node_modules`, `.next`) | **96** |
| App Router pages (`page.tsx`) | **9** |
| API route handlers (`route.ts`) | **6** |
| React components (`.tsx` under `src/components`) | **31** (18 dashboard/chat/site-nav + 12 `ui/` + 3 test files) |
| of which shadcn/ui primitives | 11 (`badge, button, card, dialog, input, label, select, separator, sonner, table, tabs`) |
| CLI scripts | **7** (5 wired to npm, 2 dead) |
| Data-source fetcher modules | **14** |
| Unit/component test files | **7** |
| E2E spec files | **2** (+ 3 helpers) |
| npm scripts | **9** |
| Direct dependencies | **31** (7 unused) |
| Dev dependencies | **24** |

**Data (live `data/india.db`, 2026-10-04)**

| Metric | Value |
|---|---|
| Countries | **217** |
| Indicators registered | **123** |
| Indicators with data | **117** (95%) |
| Data points | **252,834** |
| Sources seeded | **33** |
| TF-IDF chunks | **50,000** |
| Year span | **1950 – 2026** |
| Categories | **10** |
| Lower-is-better indicators | **37** |
| Historical events annotated | **24** |
| Indicator guides written | ~68 of 123 |

**Endpoints: 6 total** — 4 GET read APIs + 2 POST AI endpoints. **0 authenticated, 0 rate-limited.**

### 20.3 Facts

| | |
|---|---|
| **Package name** | `india-dashboard` |
| **Version** | `0.1.0` |
| **Private** | `true` — never published to npm |
| **Node requirement** | 22+ (for `node:sqlite`) |
| **Framework** | Next.js `16.2.11`, App Router, React `19.2.4` |
| **Language** | TypeScript `^5`, `strict: true` |
| **Local DB** | SQLite via `node:sqlite` → `data/india.db` |
| **Production DB** | PostgreSQL via `pg` → Supabase (⚠️ currently broken) |
| **ORM** | **None** — hand-written SQL |
| **Migration tool** | **None** — idempotent `CREATE TABLE IF NOT EXISTS` on boot |
| **Styling** | Tailwind CSS v4, OKLCH tokens, `shadcn/ui` on `@base-ui/react` |
| **Charts** | Recharts 3 (line/bar/radar/scatter) + D3-geo + TopoJSON (world map) |
| **Animation** | Motion 14 (`motion/react`) in `FlowChips` |
| **AI provider** | Groq — `llama-3.3-70b-versatile` |
| **Retrieval** | In-house TF-IDF + cosine similarity over 50,000 chunks (no vector DB) |
| **Auth** | **None** |
| **Payments / commerce** | **None** |
| **Analytics / error tracking** | **None** |
| **Tests** | Vitest 4 (51 tests, 7 files) + Playwright (2 specs, 7 journey tests + a health sweep) |
| **Coverage measurement** | **None configured** |
| **Test command** | `npm test` (Vitest). E2E: `npx playwright test` (no npm script) |
| **Hosting** | Vercel serverless (`vercel --prod`) |
| **Domain** | **TBD / Not found in codebase** |
| **CI/CD** | **TBD / Not found in codebase** — no workflow files in repo |
| **Docker** | **None** — no Dockerfile, no docker-compose |
| **Caching layer** | **None** — no Redis/memcache; SQLite WAL + Next fetch cache only |
| **License** | README states **MIT** — ⚠️ **no `LICENSE` file exists on disk** |
| **Contributors** | **TBD / Not found in codebase** |
| **Repository** | Not a git repo in this working copy (no `.git/`) — `AGENTS.md` references `origin/master` and commit `1b29d85` |
| **Built for** | "Development Challenge 2026" (per README) |
| **Primary colour** | Amber (India Dashboard brand accent) |

---

## Coverage Report

### Sections I could document **fully from the codebase**

| § | Section | Basis |
|---|---|---|
| 1 | Project Overview | README, layout metadata, page copy. Personas were inferred and flagged as such. |
| 3 | Tech Stack | Full `package.json` read; every dependency's usage verified by a repo-wide grep for imports (7 unused deps identified by name). |
| 4 | Architecture | `src/lib/db/client.ts`, `queries.ts`, all 6 route handlers, all 9 pages, the AI layer, and every client-side `fetch` call site. 4 Mermaid diagrams. |
| 5 | Folder & File Structure | Full recursive listing (96 `.ts`/`.tsx` + configs + assets), with a purpose line per significant entry. |
| 6 | Database Design | Both DDL blocks read verbatim; live DB queried directly with `node:sqlite` for real counts, category breakdown, year range, and the zero-point list. ER diagram. |
| 7 | API / Backend | All 6 routes read end-to-end: params, validation branches, exact queries, exact response shapes, and the middleware/auth table (all "none"). |
| 8 | Frontend | All 9 pages and all major components read; state, styling (`globals.css`), and forms/validation documented. |
| 9 | Business Logic | The 5 pure modules read verbatim (`report-card.ts`, `rankings.ts`, `rank-direction.ts`, `format.ts`, `historical-events.ts`), plus `pearson()`, `getLatestRanks` SQL, TF-IDF maths, and all ingestion constants. |
| 10 | Third-Party Integrations | All 33 sources with their integration style; both AI providers traced to call sites; absences confirmed by grep. |
| 11 | Configuration & Environment | `.env.example`, `.gitignore`, and all 6 config files read; the dotenv-vs-Next env-loading asymmetry identified. |
| 12 | Setup & Installation | Synthesised from `README.md`, `package.json` scripts, `AGENTS.md`, and `playwright.config.ts`. Commands verified against `scripts/`. |
| 13 | Deployment | `AGENTS.md` + `README.md` deployment sections; confirmed no `vercel.json`, no `.github/`, no Dockerfile. |
| 14 | Security & Performance | `next.config.ts` (empty), `client.ts` pragmas, `queries.ts` indexes, the 6 client fetch sites, and the absence of headers/rate-limit/validation. |
| 15 | Testing | `vitest.config.ts`, `playwright.config.ts`, both specs and all 3 helpers read; gaps derived from what is absent. |
| 16 | Known Issues | 22 numbered findings. 6 are **confirmed bugs I verified directly** (broken `migrate-pg` script, ignored `ingest:wb` argv, module-scope `new Groq()`, limit-10 rank card, `/country/IND` self-radar, alphabetical TF-IDF truncation); the rest are read from `AGENTS.md` or derived from code comparison. |
| 17 | Future Enhancements | 5 items cited to README/AGENTS "Next steps"; the other 36 derived from the specific gaps found in §14–16. |
| 20 | Glossary & Quick Facts | All 40+ terms traced to their file/definition; all statistics measured. |

### Sections documented **partially**

| § | What's partial | Why |
|---|---|---|
| **1** | *Target users* | No personas in the codebase. I inferred five from the shipped features and labelled the inference. |
| **2** | *Feature statuses* | Statuses are based on reading code. I could not verify **runtime** behaviour for the world map, scatter, compare, or chat without running the app. |
| **3** | *Why each library* | Rationale is taken from README/comments where present. For `motion`, `adm-zip`, and `date-fns` there is no recorded rationale. |
| **6** | *Seed data & migrations* | I read the schema code and confirmed the live row counts. I did **not** run a fresh `npm run ingest` (network + minutes), so I cannot confirm every one of the 33 sources currently succeeds — `epi` and 3 others are at 0 points. |
| **10** | *Data-source mechanics* | I documented the integration **style** per source from `sources/*.ts` and the `type` column, but did not execute each fetcher, so I cannot confirm which upstream URLs are still live. |
| **12** | *Prerequisites* | Node 22+ is inferred from `node:sqlite` usage and the `client.ts` header. There is no `engines` field or `.nvmrc`. |
| **13** | *CI/CD* | Nothing in-repo. Vercel Git integration may exist out-of-band — unverifiable from here. |
| **14** | *SEO* | I audited what exists in code. Actual rankings and Core Web Vitals are unmeasurable without a live deployment. |
| **15** | *Test count* | **51 passing** per the latest verification. `AGENTS.md` records 41; I did not execute `npm test` myself. Treat 51 as the current figure and re-run to confirm. |
| **18** | *Development history* | The working copy has **no `.git` directory**, so `git log` was impossible. The entire timeline is inferred from `AGENTS.md`, `README.md`, and code evolution traces. Real dates, authors, and SHAs are unavailable. |
| **19** | *Screenshots* | A recommended capture list, not captured images. |
| **20** | *License / contributors* | README says MIT; **no `LICENSE` file exists**. No author metadata anywhere. |

### What I need from you

**Critical — blocks accurate documentation:**

1. **A working production database (or a decision to change platforms).** Production is currently 500 on every server-rendered page because the Supabase host is dead. Do you want to (a) create a new Supabase project and re-seed, (b) move to a different provider (Neon / Turso / PlanetScale), or (c) document the current broken state as a known limitation? This determines §13 and the top item in §17.
2. **The domain and the live URL**, if a deployment exists or is planned. Also: is there a GitHub repository, and is Vercel's Git integration configured?
3. **`CLAUDE.md` contents** — I confirmed the file exists but did not read it; it may hold setup or convention detail that belongs in §12.
4. **Confirmation of the test count** — may I run `npm test` and `npm run build` to verify the current state (51 tests, 11 pages) rather than relying on the reported figure?

**Important — needed for §1, §2, and §18:**

5. **Business context**: Who is this for? Is it a competition submission (README says "Development Challenge 2026"), a portfolio piece, a policy tool, or a real product? Is there a deadline?
6. **Target users**, explicitly — I inferred journalists/analysts/students/researchers. Correct me.
7. **The intended positioning of the A–F grade.** Percentile-based grading of a country is inherently value-laden. Is there a stated editorial stance, and is the methodology page's framing (step 5: "a low raw value can still earn a good grade") the position you want documented?
8. **The 6 zero-point indicators** — `epi`, `ccpi`, `qs_rank`, `digital_competitiveness`, `broadband_speed`, `startup_ecosystem`. Should the final docs (a) state they are permanently unavailable, (b) omit them, or (c) find paid/alternative sources? This affects whether "123 indicators" or "117 indicators" is the headline number.
9. **Contributors and authorship** — names/roles for §20.3, plus whether the MIT claim in the README should become an actual `LICENSE` file.

**Nice-to-have — improves §19 and §14:**

10. **Screenshots** — I listed 21 in §19.1. If you can supply captures (or start the dev server so I can take them), I can also verify runtime behaviour and the dark-mode gap.
11. **Any analytics or feedback you want added** — currently there are none. If judges or users will look for engagement tracking, that's a §17 addition.
12. **Deployment constraints** — any budget cap, region requirement, or compliance constraint that rules out Supabase or Vercel.
13. **Roadmap horizon** — is `auth / users` genuinely next, or is the data-coverage work higher priority? This reorders §17.