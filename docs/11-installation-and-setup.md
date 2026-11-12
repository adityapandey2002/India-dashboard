# 11 — Installation and Setup

## Prerequisites

- Node.js 20+ (Node 22+ for `node:sqlite`).
- npm.
- (Optional) Groq API key, HuggingFace token.

## Steps

```bash
# 1. install dependencies
npm install

# 2. configure env
cp .env.example .env
# edit .env: set GROQ_API_KEY (optional), leave DATABASE_URL commented for SQLite

# 3. fetch data
npm run ingest

# 4. (optional) verify
npm run status

# 5. (optional) build search index
npm run index-embeddings

# 6. start dev server
npm run dev
# open http://localhost:3000
```

## Production DB setup (when ready)

See AGENTS.md → PostgreSQL Migration. Create new Supabase project, set `DATABASE_URL`, run `npm run ingest`, `npm run index-embeddings`, then remove `DATABASE_URL` from `.env`.

## Build

```bash
npm run build
npm start
```
