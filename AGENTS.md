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
1. `npm run ingest` — Fetch all indicator data from WB, UNDP, WHO, OWID, WGI
2. `npm run index-embeddings` — Build local TF-IDF search index (no API key needed)

## Remaining Tasks
- **PostgreSQL migration** — Swap `node:sqlite` → `pg` for Vercel/Supabase
- **Vercel deploy** — `vercel --prod` with DATABASE_URL + GROQ_API_KEY
