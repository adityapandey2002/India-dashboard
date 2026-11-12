# 14 — Deployment and Infrastructure

## Hosting

- **Vercel** serverless (`vercel --prod`).
- `GROQ_API_KEY` set in Vercel dashboard; `DATABASE_URL` (when fixed) too.

## Database in production

- SQLite is NOT viable on Vercel serverless (ephemeral FS; `data/*.db` gitignored).
- Production needs a live Postgres (Supabase). Original host is dead (ENOTFOUND).
- Until replaced, deployed pages 500. See AGENTS.md Known issues.

## Deploy steps (once DB fixed)

1. Create new Supabase project; copy connection string.
2. Set `DATABASE_URL` in Vercel env vars.
3. Set `GROQ_API_KEY`.
4. `vercel --prod`.

## Local vs prod parity

- Local uses SQLite; prod uses PG via `DATABASE_URL`. Same code path via auto-detect.

## Environment on Vercel

- `.vercel/` holds project linkage and build output (generated).
- `.env.local` from Vercel CLI contains masked placeholder `DATABASE_URL` (`echo "…"`), does not flip driver.
