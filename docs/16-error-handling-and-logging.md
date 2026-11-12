# 16 — Error Handling and Logging

## Patterns

- DB `query`/`execute` throw on failure (no catch in client); read APIs wrap in try/catch → generic 500.
- AI `chat`/`chatDetailed` return discriminated result with `reason` (missing-key, unauthorized, model-unavailable, rate-limited, bad-request, empty-response, upstream-error); routes log reason (JSON.stringify, key never included) and return truthful message.
- Embeddings return `null` on failure.
- Ingestion scripts track failures array and continue (`allSettled`).
- Frontend: no global error boundary documented; pages may throw (caught by Next.js error handling).
- `sonner` Toaster available for client toasts.

## Logging

- Scripts `console.log` progress and final summaries.
- Server-side `console.error` for AI route failures.
- E2E helpers collect console/page errors.
- No structured logging/monitoring tool integrated (none verified).
- Vercel logs available in dashboard (not in repo).

## Not implemented

- Centralized error reporting (Sentry etc.) — not present.
- Request ID tracing — not present.
