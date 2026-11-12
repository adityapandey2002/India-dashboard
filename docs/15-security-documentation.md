# 15 — Security Documentation

## Implemented

- Framework defaults (Next.js). Security headers via `next.config.ts`: CSP (self-only, unsafe-inline/eval for Next bootstrap + Turbopack HMR), X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS.
- Middleware rate limiting: `/api/ai/chat` 15/min, `/api/ai/insights` 30/min per IP → 429 + Retry-After (in-memory, per instance).
- Parameter validation on read APIs (indicator id regex, ISO3, year/limit clamping).
- Sanitized error responses (generic messages; server-side logging).
- SQL parameterized via `?`→`$N`; no user input in SQL except internal `bulkInsert`.
- Secrets via env vars; `.env*` gitignored; `.env.example` empty placeholders.
- TF-IDF search: question clamped 500 chars; query vector top-32 IDF terms; memoized index with fingerprint invalidation.
- Context fencing in chat (`<context>` tags); history sanitized (last 6, role coerced, no caller system turn).
- Groq model resolved at runtime; no hardcoded model id.
- `NEXT_PUBLIC_*` not used for secrets.

## Not implemented

- Authentication/authorization (none).
- Distributed rate limiting (use Vercel KV/Upstash).
- RBAC.

## Recommendations (not implemented)

- Move rate-limit buckets to Vercel KV/Upstash.
- Migrate `xlsx` to SheetJS tarball or exceljs (CVEs).
- Remove unused drizzle-orm/drizzle-kit.
- Add auth when user features needed.

Distinguish: above recommendations are proposed, not implemented.
