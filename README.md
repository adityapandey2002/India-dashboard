# India in the World — Global Progress Dashboard

> A live dashboard that tracks India's rankings across 123 registered global
> indicators (117 currently with data — economy, health, education, environment,
> governance, technology, and more), sourced from trusted public datasets like
> the World Bank, WHO, UNDP, OWID, and Numbeo.

Built for the **Development Challenge 2026**. Designed as a real product, not a
hackathon demo — clean data, clean code, shippable today.

---

## What's in here

| Area | What we have | Status |
|---|---|---|
| Data layer | SQLite locally (`node:sqlite`) + optional Supabase PG via `DATABASE_URL` auto-detect (`src/lib/db/client.ts`) | ✅ |
| Data ingestion | 34 sources → 217 countries, 252,834 data points (WB, UNDP, WHO, OWID, WGI, TI, Numbeo, …) | ✅ |
| Indicator registry | 123 indicators, categorized, source-mapped (`src/lib/data/indicators.ts`) | ✅ |
| Home page | KPI cards, 4 multi-country trend charts, interactive D3 world map, scatter correlation | ✅ |
| Explore / Indicator / Country | `/explore` (category filter + search), `/indicator/[id]`, `/country/[iso3]` (radar vs India + on-demand AI analysis) | ✅ |
| Compare page | `/compare` — multi-country line/bar/radar + delta highlights + AI insight panel | ✅ |
| Rankings page | `/rankings` — sortable world rankings, India rank-over-time | ✅ |
| Report card | `/report-card` — A–F grade, per-category scores, Print/CSV export | ✅ |
| API | `/api/indicators/series`, `/api/indicators/leaderboard`, `/api/rankings`, `/api/scatter`, `/api/ai/*` | ✅ |
| Design system | shadcn/ui + Tailwind v4 + Recharts + D3 | ✅ |
| AI insights | Groq RAG chat with citations (`/chat`) + `/api/ai/insights` | ✅ |
| Auth / users | — | ⏳ next |
| Production DB (Supabase PG) | ⚠️ old Supabase host is dead (ENOTFOUND); production `DATABASE_URL` unverified — SQLite can't run on Vercel serverless | ⚠️ blocked |

> ⚠️ **Deployment status:** the original Supabase PG host is dead (DNS no longer
> resolves, ENOTFOUND), and the Vercel env vars likely still point at it — until
> replaced, deployed pages 500 ("Error in Server Components render"). Local dev
> runs on SQLite and is unaffected. See `AGENTS.md` → **Known issues / deployment
> status**.

---

## Architecture (in plain English)

```
   ┌─────────────────────────┐
   │   Public data sources   │  (World Bank API, WHO, UNDP, OWID, Numbeo, ...)
   └────────────┬────────────┘
                │  HTTP / scrape
                ▼
   ┌─────────────────────────┐
   │   scripts/ingest.ts     │  ← run with `npm run ingest`
   │   (TypeScript, parallel)│     parallel fetches, idempotent UPSERTs
   └────────────┬────────────┘
                │
                ▼
   ┌─────────────────────────┐
   │ data/india.db (SQLite)  │  ← SQLite local; set DATABASE_URL → Supabase PG (auto-detect)
   └────────────┬────────────┘
                │
                ▼
   ┌─────────────────────────┐
   │  src/lib/db/queries.ts  │  ← single source of truth for DB access
   └────────────┬────────────┘
                │
                ▼
   ┌─────────────────────────┐
   │  src/app/  (Next.js 16) │  ← pages + API routes
   │  src/components/        │  ← shadcn/ui + custom dashboards
   └─────────────────────────┘
```

**Why this shape?**

- **Server components first.** Pages fetch data on the server, send only the
  shape the client needs. First paint is fast and SEO-friendly.
- **One DB layer.** `src/lib/db/queries.ts` is the *only* place that knows
  SQL, and `src/lib/db/client.ts` auto-detects the driver: local SQLite when no
  `DATABASE_URL` is set, Supabase PG when it is.
- **One indicator registry.** `src/lib/data/indicators.ts` lists all 123
  metrics with their source + upstream ID. Add an indicator there and the
  ingestion script picks it up automatically.
- **Free-first.** Local SQLite, free-tier Vercel, free AI APIs (Groq,
  HuggingFace). We pay for a domain and, later, Claude API.

---

## Run it locally

```bash
# 1. install
npm install

# 2. copy the env template and fill in API keys
cp .env.example .env.local
# → set GROQ_API_KEY (chat) and optionally HF_API_KEY (embeddings).
#   Leave DATABASE_URL commented out to run on local SQLite.

# 3. fetch data (34 sources → data/india.db: 217 countries,
#    123 indicators, 252k data points)
npm run ingest

# 4. verify the data (optional but handy)
npm run status

# 5. start the dev server
npm run dev
# → open http://localhost:3000
```

## Build for production

```bash
npm run build   # ✓ clean build in ~10s
npm start
```

## Project layout

```
india-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # root layout, fonts, SiteNav
│   │   ├── globals.css             # Tailwind v4 + theme
│   │   ├── page.tsx                # /  → India overview (KPIs, charts, world map)
│   │   ├── explore/page.tsx        # /explore — category filter + search
│   │   ├── indicator/[id]/page.tsx # /indicator/:id — per-indicator detail
│   │   ├── country/[iso3]/page.tsx # /country/:iso3 — profile + radar vs India
│   │   ├── compare/page.tsx        # /compare — multi-country charts + AI insights
│   │   ├── rankings/page.tsx       # /rankings — sortable world ranking table
│   │   ├── report-card/page.tsx    # /report-card — grades + print/CSV export
│   │   ├── chat/page.tsx           # /chat — RAG chatbot
│   │   ├── methodology/page.tsx    # /methodology
│   │   └── api/                    # indicators/series, indicators/leaderboard,
│   │                               #   rankings, scatter, ai/chat, ai/insights
│   ├── components/
│   │   ├── ui/                     # shadcn/ui (button, card, table, ...)
│   │   ├── dashboard/              # stat-card, trend-chart, world-map-card, scatter-chart, ...
│   │   ├── chat/                   # chat-interface.tsx
│   │   └── site-nav.tsx            # responsive nav
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts           # SQLite/PG auto-detect + bulkInsert
│   │   │   ├── queries.ts          # all DB queries used by the app
│   │   │   └── types.ts            # TypeScript shapes + row mappers
│   │   ├── data/
│   │   │   ├── indicators.ts       # the 123-indicator registry
│   │   │   └── sources/            # world-bank.ts, undp.ts, owid-generic.ts, ...
│   │   ├── ai/                     # embeddings, vector-search, Groq client
│   │   ├── format.ts               # shared fmtValue / fmtMoney (compact numbers)
│   │   ├── report-card.ts          # A–F grade + score helpers
│   │   ├── rankings.ts             # ranking helpers (ties share rank)
│   │   ├── trend.ts                # shared YoY trend classification (0.5% flat)
│   │   └── rank-direction.ts       # which indicators are lower-is-better
│   └── test/
│       └── setup.ts                # Vitest setup (jsdom)
├── src/types/
│   └── node-sqlite.d.ts            # local type defs for node:sqlite
├── scripts/
│   ├── ingest.ts                   # full data ingestion (all sources)
│   ├── ingest-new.ts               # fast path for newest sources
│   ├── index-embeddings.ts         # TF-IDF search index
│   └── status.ts                   # data coverage report
├── data/                           # SQLite files (gitignored)
├── .env / .env.example             # gitignored except .env.example
├── next.config.ts
├── vitest.config.ts
├── package.json
└── README.md
```

## The 123 indicators we support

| Category | Indicators |
|---|---|
| 🛢 Economy | 22 |
| 💻 Tech & Innovation | 17 |
| 👥 Society | 15 |
| 🏥 Healthcare | 14 |
| 🌱 Environment | 13 |
| 🏛 Governance | 10 |
| 🎓 Education | 10 |
| 🛡 Safety | 8 |
| ⚖ Equality | 9 |
| 🌐 Digital Gov | 5 |

> 117 of the 123 currently have data; the 6 zero-point indicators are listed by
> `npm run status` (the 5 with no usable open dataset are called out in AGENTS.md).
> We started with World Bank because it's the highest-coverage, no-auth source.
> Every other source follows the same shape — drop a fetcher in
> `src/lib/data/sources/`, add it to the registry, run `npm run ingest`.

## Next steps (the plan)

1. **Fix the production DB story** — the original Supabase project is dead (host
   DNS no longer resolves). Create a new Supabase project, re-seed it
   (`npm run ingest` with `DATABASE_URL` set), then update the Vercel env vars.
   SQLite can't run on Vercel serverless (ephemeral FS; `data/*.db` is gitignored),
   so production is blocked until this is done.
2. **Source the remaining zero-point indicators** — 6 indicators currently at 0
   points (see `npm run status`). The 5 with no usable open dataset and the
   1 whose fetcher needs debugging (`epi`) are listed in AGENTS.md.
3. **Auth / users** — next feature on the roadmap.
4. **Keep improving the AI layer** — Groq RAG chat is live at `/chat`; integrate
   more source documents, move to Claude when traffic warrants.

## Why these tools? (1-line each)

- **Next.js 16** — full-stack React, server components = fast + SEO-friendly.
- **TypeScript strict** — bugs caught at compile time, judges love it.
- **Tailwind + shadcn/ui** — copy-paste components, no locked-in dep, fast to customize.
- **Recharts** — React-native charts, plays well with server components.
- **Node's built-in SQLite** — zero install, zero compile pain. Supabase PG is
  supported through `DATABASE_URL` auto-detect in `src/lib/db/client.ts`.
- **Zustand / TanStack Query** — ready when we need client state / cache.

## License

MIT. Open-source the data when we have a clean release.
