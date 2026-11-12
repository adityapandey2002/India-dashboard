# 15 — Security Documentation

## Implemented

- Framework defaults (Next.js). No custom security headers documented.
- Secrets via env vars; `.env*` gitignored.
- `pg` parameterized queries (`?`→`$N`); no string interpolation of user input in SQL except table/column names in `bulkInsert` (internal use).
- Input validation: Zod present in deps (usage not verified in routes).

## Not implemented

- Authentication/authorization (none).
- Rate limiting.
- CORS configuration (default).
- File upload restrictions (no uploads).
- RBAC.

## Recommendations (not implemented)

- Add security headers (CSP, HSTS) in `next.config.ts`.
- Add rate limiting on `/api/ai/*`.
- Validate all route params with Zod.
- Add auth before exposing user-specific features.

Distinguish: above recommendations are proposed, not implemented.
