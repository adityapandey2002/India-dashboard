# 03 — Project Structure

## Root tree (meaningful files)

```
india-dashboard/
├── src/
│   ├── app/                  # Next.js App Router (pages + API routes)
│   │   ├── layout.tsx        # root layout, fonts, SiteNav
│   │   ├── page.tsx          # / home
│   │   ├── globals.css       # Tailwind v4 + theme
│   │   ├── favicon.ico
│   │   ├── explore/          # /explore
│   │   ├── indicator/[id]/   # /indicator/:id
│   │   ├── country/[iso3]/   # /country/:iso3
│   │   ├── compare/          # /compare
│   │   ├── rankings/         # /rankings
│   │   ├── report-card/      # /report-card
│   │   ├── chat/             # /chat
│   │   ├── methodology/      # /methodology
│   │   └── api/              # route handlers
│   ├── components/
│   │   ├── ui/               # shadcn base-ui wrappers
│   │   ├── dashboard/        # feature components
│   │   ├── chat/             # chat-interface
│   │   └── site-nav.tsx
│   ├── lib/
│   │   ├── db/               # client, queries, types
│   │   ├── data/             # indicators registry + sources/
│   │   ├── ai/               # Groq client, embeddings, vector search
│   │   ├── format.ts, rankings.ts, rank-direction.ts, report-card.ts,
│   │   │   historical-events.ts, indicator-guides.ts, utils.ts
│   │   └── test/             # (none here; tests colocated)
│   ├── test/setup.ts         # Vitest setup (jsdom)
│   └── types/node-sqlite.d.ts
├── scripts/                  # ingest, ingest-new, index-embeddings, status, checks, migrate
├── e2e/                      # Playwright specs + helpers
├── public/                   # static assets incl. world-110m.json
├── data/                     # SQLite DB (gitignored)
├── docs/                     # this documentation
├── .vercel/                  # Vercel output (generated)
├── package.json, tsconfig.json, next.config.ts, vitest.config.ts,
│   eslint.config.mjs, postcss.config.mjs, playwright.config.ts, components.json
├── AGENTS.md, CLAUDE.md, README.md
└── .env, .env.example, .env.local, .gitignore
```

## Important directories

- `src/app` — routing, pages, API handlers. Server components by default.
- `src/components/dashboard` — reusable dashboard widgets.
- `src/lib/db` — single DB access layer; queries.ts is the only SQL consumer.
- `src/lib/data/indicators.ts` — indicator registry (121 seeds) + `READY_SOURCES`.
- `src/lib/data/sources/*` — one fetcher per upstream source.
- `src/lib/ai` — Groq + HF + local TF-IDF search.
- `scripts` — data pipeline entry points.
- `e2e` — Playwright critical-flow tests.
- `data` — local SQLite (gitignored).

## Excluded from docs tree

`node_modules`, `.git`, `data`, `.next`, `dist`, `build`, `coverage`, `.vercel/output` (generated).
