# 02 — Technology Stack

## Languages

- **TypeScript 5** (strict) — all app, lib, scripts.
- **JavaScript (CommonJS)** — `scripts/check-remaining.cjs`, `scripts/migrate-to-pg.mjs`.
- **SQL** — SQLite/Postgres dialect via `?` placeholders.
- **CSS** — Tailwind v4 utility classes + `globals.css`.

## Frameworks

- **Next.js 16.2.11** (App Router) — full-stack React, server components, route handlers.
- **React 19.2.4** — UI.
- **Tailwind CSS 4** — styling via `@tailwindcss/postcss`.

## UI

- **shadcn/ui** components (base-nova style, `@base-ui/react` primitives) under `src/components/ui`.
- **Recharts 3.10** — charts.
- **D3** (`d3-geo`, `d3-scale`) — world map.
- **world-atlas** — TopoJSON world boundaries.
- **lucide-react** — icons.
- **next-themes** — theme support.
- **sonner** — toasts.

## State / data fetching

- **Zustand 5**, **TanStack Query** referenced but light usage; mostly server components.
- Native `fetch` in client components.

## Backend / DB

- **node:sqlite** (`DatabaseSync`) — local, Node 22+.
- **pg 8** — Postgres driver when `DATABASE_URL` set.
- **drizzle-orm 0.45** + drizzle-kit — present in deps (not central to runtime; schema defined in client.ts).

## Data parsing

- **papaparse** — CSV.
- **xlsx** — XLSX.
- **adm-zip** — WGI zip.

## AI

- **groq-sdk 1.4** (via fetch to Groq OpenAI-compatible endpoint) — LLM chat/insights.
- **HuggingFace Inference API** — optional embeddings (all-MiniLM-L6-v2).
- Local TF-IDF vector search (`src/lib/ai/vector-search.ts`) — no external embedding required.

## Tooling

- **tsx 4** — run TS scripts.
- **Vitest 4** + Testing Library (jsdom) — unit tests.
- **Playwright 1.63** — E2E.
- **ESLint 9** (flat config) + eslint-config-next.
- **TypeScript 5**.
- **Vercel CLI 59**.
- **dotenv 17**.

## External platforms

- **Vercel** — hosting (serverless).
- **Supabase** — optional Postgres (host currently dead).
- **Groq** — LLM inference (free tier).
- **HuggingFace** — optional embeddings.

## Relationship notes

- DB driver auto-detected by `DATABASE_URL` env var; same `query`/`execute`/`bulkInsert` API.
- SQLite uses `?` placeholders; PG rewrites `?`→`$N` in `pgSql`.
- Tailwind v4 configured via PostCSS plugin (no tailwind.config.js).
- Next.js 16 has breaking changes vs training data; see `node_modules/next/dist/docs`.
