# 10 — Configuration and Environment

## Environment variables

| Variable | Required | Purpose | Default |
|---|---|---|---|
| `DATABASE_PATH` | No | SQLite file path | `./data/india.db` |
| `DATABASE_URL` | No | Postgres connection string; if set, switches driver to PG | unset (SQLite) |
| `GROQ_API_KEY` | No* | Groq LLM for chat/insights | unset → chat returns null |
| `HF_API_KEY` | No | HuggingFace embeddings | unset → embeddings disabled |

\* Required for AI features to work, but app runs without.

## Config files

- `next.config.ts` — empty NextConfig.
- `tsconfig.json` — strict TS, `@/*` → `./src/*`.
- `vitest.config.ts` — jsdom, setup, alias.
- `eslint.config.mjs` — next core-web-vitals + typescript.
- `postcss.config.mjs` — Tailwind v4.
- `playwright.config.ts` — E2E (baseURL 3456, 1 worker).
- `components.json` — shadcn config.
- `.env.example` — template.

## .gitignore

`.env*` ignored (so `.env`, `.env.local` not committed). `data/*.db` ignored.

## Security note

Never commit real `DATABASE_URL` or API keys.
