# 08 — API Documentation

Base: same origin. All responses JSON. No auth.

## GET /api/scatter

Params: `x`, `y` (indicator ids).
Returns: points `{iso3,name,x,y,yearX,yearY}`, Pearson `r`, `india` point, indicator meta.

## GET /api/rankings

Param: `indicator` (id).
Returns: `{indicator, rankings:[{iso3,name,value,year,rank}], india:{rank,total,value,year}, history:[{year,rank,total}], names}`.

## GET /api/indicators/series

Params: `country` (iso3), `indicator` (id).
Returns: `{iso3, indicator, data:[{year,value}]}`.

## GET /api/indicators/leaderboard

Params: `indicator`, `year?`, `limit?`.
Returns: `{indicator, year, years[], rows:[{iso3,name,value,rank}]}`.

## POST /api/ai/insights

Body: `{iso3}`.
Returns: `{analysis}` (3-sentence Groq analysis) or error.

## POST /api/ai/chat

Body: `{question, conversationHistory?}`.
Returns: `{answer, citations:[{source,indicatorId?}]}`.

## Notes

- No OpenAPI/Swagger spec implemented.
- No rate limiting documented.
- Errors return JSON with status codes; details in `16`.
