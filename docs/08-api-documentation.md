# 08 — API Documentation

Base: same origin. All responses JSON. No auth.

## Rate limiting

- `/api/ai/chat`: 15 req/min per IP (middleware).
- `/api/ai/insights`: 30 req/min per IP (middleware).
- Exceeding returns 429 + `Retry-After`.

## GET /api/scatter

Params: `x`, `y` (indicator ids).
Returns: points `{iso3,name,x,y,yearX,yearY}`, Pearson `r`, `india` point, indicator meta.

## GET /api/rankings

Param: `indicator` (id). Validates params; wraps DB in try/catch → generic 500.
Returns: `{indicator, rankings:[{iso3,name,value,year,rank}], india:{rank,total,value,year}, history:[{year,rank,total}], names}`.

## GET /api/indicators/series

Params: `country` (ISO3), `indicator` (id). Validates params.
Returns: `{iso3, indicator, data:[{year,value}]}`.

## GET /api/indicators/leaderboard

Params: `indicator`, `year?`, `limit?` (clamped 1–250). Validates params.
Returns: `{indicator, year, years[], rows:[{iso3,name,value,rank}]}`.

## POST /api/ai/insights

Body: `{iso3?, year?}`. Validates iso3; Groq model resolved at runtime.
Returns: `{analysis}` or `{error, reason}` with status mapping (429/502/503).

## POST /api/ai/chat

Body: `{question, conversationHistory?}`. Validates question (non-empty, ≤500 chars); sanitizes history (last 6, role coerced). Context fenced in `<context>`.
Returns: `{answer, citations}`.

## Notes

- No OpenAPI/Swagger served at runtime; static spec at `docs/openapi.yaml`.
- No distributed rate limiting (in-memory, per instance).
