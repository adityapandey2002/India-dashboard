# India in the World — Global Progress Dashboard

> A live dashboard that tracks India's rankings across 80+ global indicators
> (economy, health, education, environment, governance, technology, and more),
> sourced from trusted public datasets like the World Bank, WHO, UNDP, and ITU.

Built for the **Development Challenge 2026**. Designed as a real product, not a
hackathon demo — clean data, clean code, shippable today.

---

## What's in here

| Area | What we have | Status |
|---|---|---|
| Data layer | Node 24's built-in SQLite + a thin query wrapper (`src/lib/db/`) | ✅ |
| World Bank ingestion | 22+ indicators × 30 countries × 2010–2025 (≈10,700 data points) | ✅ |
| Indicator registry | All 80+ indicators from the brief, categorized, source-mapped | ✅ |
| India overview page | Live KPIs, GDP trend chart, global leaderboard, life-expectancy chart | ✅ |
| API | `/api/indicators/series` and `/api/indicators/leaderboard` | ✅ |
| Design system | shadcn/ui + Tailwind v4 + Recharts | ✅ |
| Auth / users | — | ⏳ next |
| AI insights | — | ⏳ next (free Groq + HF embeddings) |
| Map (deck.gl) | — | ⏳ month 2 |
| Country comparison page | — | ⏳ month 1 |
| Postgres migration | — | ⏳ when we have real users |

---

## Architecture (in plain English)

```
   ┌─────────────────────────┐
   │   Public data sources   │  (World Bank API, WHO, UNDP, ITU, ...)
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
   │  data/india.db (SQLite) │  ← swap to Postgres later (one file change)
   └────────────┬────────────┘
                │
                ▼
   ┌─────────────────────────┐
   │  src/lib/db/queries.ts  │  ← single source of truth for DB access
   └────────────┬────────────┘
                │
                ▼
   ┌─────────────────────────┐
   │  src/app/  (Next.js 15) │  ← pages + API routes
   │  src/components/        │  ← shadcn/ui + custom dashboards
   └─────────────────────────┘
```

**Why this shape?**

- **Server components first.** Pages fetch data on the server, send only the
  shape the client needs. First paint is fast and SEO-friendly.
- **One DB layer.** `src/lib/db/queries.ts` is the *only* place that knows
  SQL. When we move to Postgres, we change one file.
- **One indicator registry.** `src/lib/data/indicators.ts` lists all 80+
  metrics with their source + upstream ID. Add an indicator there and the
  ingestion script picks it up automatically.
- **Free-first.** Local SQLite, free-tier Vercel, free AI APIs (Groq,
  HuggingFace). We pay for a domain and, later, Claude API.

---

## Run it locally

```bash
# 1. install
npm install

# 2. fetch data (≈3 min, populates data/india.db with ~10k data points)
npm run ingest

# 3. start the dev server
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
│   │   ├── layout.tsx              # root layout, fonts, metadata
│   │   ├── page.tsx                # /  → India overview (server component)
│   │   ├── globals.css             # Tailwind v4 + theme
│   │   └── api/indicators/
│   │       ├── series/route.ts     # GET ?country=&indicator=
│   │       └── leaderboard/route.ts# GET ?indicator=&year=
│   ├── components/
│   │   ├── ui/                     # shadcn/ui (button, card, table, ...)
│   │   └── dashboard/              # stat-card, trend-chart, leaderboard
│   ├── lib/
│   │   ├── db/
│   │   │   ├── client.ts           # SQLite connection + migrations
│   │   │   ├── queries.ts          # all DB queries used by the app
│   │   │   └── types.ts            # TypeScript shapes + row mappers
│   │   └── data/
│   │       ├── indicators.ts       # the 80+ indicator registry
│   │       └── sources/
│   │           └── world-bank.ts   # World Bank API v2 client
│   └── types/
│       └── node-sqlite.d.ts        # local type defs for node:sqlite
├── scripts/
│   └── ingest.ts                   # data ingestion entrypoint
├── data/                           # SQLite files (gitignored)
├── .env / .env.example
├── next.config.ts
├── package.json
└── README.md
```

## The 80+ indicators we plan to support

| Category | Indicators | Source today |
|---|---|---|
| 🌍 Economy | 12 | 12 via World Bank |
| 👥 Society | 7 | 4 via World Bank (rest via UNDP) |
| 🏛 Governance | 9 | 4 via World Bank (rest via TI, WJP, EIU) |
| 💻 Tech & Innovation | 9 | 3 via World Bank (rest via ITU, WIPO, Oxford) |
| 🎓 Education | 6 | 4 via World Bank (rest via OECD, QS) |
| 🏥 Healthcare | 9 | 8 via World Bank (rest via WHO, IHME) |
| 🌱 Environment | 8 | 4 via World Bank (rest via Yale, Germanwatch) |
| 🛡 Safety | 6 | 1 via World Bank (rest via IEP, Numbeo) |
| ⚖ Equality | 4 | 4 via World Bank |
| 🌐 Digital Gov | 5 | 0 today (UN, WB, IMD) |

> We started with World Bank because it's the highest-coverage, no-auth source.
> Every other source follows the same shape — drop a fetcher in
> `src/lib/data/sources/`, add it to the registry, run `npm run ingest`.

## Next steps (the plan)

1. **Add more sources** (UNDP, WHO, ITU, WIPO) — one fetcher per source, same shape.
2. **Country comparison page** at `/compare` — pick any 2-5 countries + any indicator.
3. **Interactive world map** with deck.gl — choropleth + year slider.
4. **Free AI layer** — Groq for chat, HuggingFace for embeddings, RAG over all
   source documents. Will move to Claude when we have paying traffic.
5. **Move DB to Postgres** (Supabase free tier) — one-file change in
   `src/lib/db/client.ts`. Will do this when SQLite starts to feel slow.
6. **Deploy to Vercel** — `vercel` CLI, 1 command, free tier is enough for months.

## Why these tools? (1-line each)

- **Next.js 15** — full-stack React, server components = fast + SEO-friendly.
- **TypeScript strict** — bugs caught at compile time, judges love it.
- **Tailwind + shadcn/ui** — copy-paste components, no locked-in dep, fast to customize.
- **Recharts** — React-native charts, plays well with server components.
- **Node's built-in SQLite** — zero install, zero compile pain. Trivial to swap for Postgres.
- **Zustand / TanStack Query** — ready when we need client state / cache.

## License

MIT. Open-source the data when we have a clean release.
