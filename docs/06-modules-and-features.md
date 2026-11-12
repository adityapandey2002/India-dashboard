# 06 — Modules and Features

## Module map

### `src/lib/db` — Data access

- `client.ts` — driver auto-detect (SQLite/PG), `query`, `execute`, `bulkInsert`, migrations (schema creation).
- `queries.ts` — all app SQL: indicators, countries, data points, snapshots, ranks, leaderboards, coverage, stats.
- `types.ts` — `Country`, `Indicator`, `DataPoint`, `Source`, `Category` + row mappers.

### `src/lib/data` — Indicator registry & ingestion

- `indicators.ts` — 123 seeds + `READY_SOURCES` (35+). `getAvailableIndicators()` filters ready.
- `sources/*` — one fetcher per upstream (see 17).

### `src/lib/ai`

- `client.ts` — Groq LLM client (`chat`, `chatDetailed`, `chatFailureMessage`); runtime model resolution + self-heal.
- `embeddings.ts` — optional HF embeddings.
- `vector-search.ts` — local TF-IDF search (memoized index, fingerprint invalidation).
- `index.ts` — barrel.

### `src/lib` helpers

- `format.ts` — `fmtValue`, `fmtMoney`, `fmtCompact`.
- `rankings.ts` — competition ranking helpers.
- `rank-direction.ts` — `isHigherBetter` map.
- `report-card.ts` — scoring/grading helpers.
- `trend.ts` — single-sourced trend classification (`computeTrend`, `FLAT_THRESHOLD_PCT`).
- `rate-limit.ts` — best-effort in-memory rate limiter.
- `historical-events.ts` — `INDIA_EVENTS`.
- `indicator-guides.ts` — plain-language guides.
- `utils.ts` — `cn` class merge.

### `src` app-level

- `src/middleware.ts` — rate-limits `/api/ai/chat` (15/min) and `/api/ai/insights` (30/min) per IP.

### `src/components`

- `ui/flow-chips.tsx` — `FlowChips` multi-select pill row (motion springs).
- `ui/*` — shadcn base-ui primitives.
- `dashboard/*` — feature widgets (map, charts, scatter, rankings, report card, comparison tool with token field, etc.).
- `chat/chat-interface.tsx`, `site-nav.tsx`.

## Features

### Core data features

- 123 registered indicators across 10 categories.
- 217 countries, ~252k data points, 34 sources (local DB).
- Auto-detecting DB driver.

### User-facing pages

- Home: KPI grid (12), 4 trend charts, world map (top), scatter correlation, GDP leaderboard.
- Explore: category filter + search, coverage stats.
- Indicator detail: India snapshot, global rank, trend, guide, chart, events, top-10, related.
- Country profile: score/grade, radar vs India, top/bottom, trend vs India, on-demand AI analysis.
- Compare: multi-country line/bar/radar, deltas, table, AI insight; token-field country selection + FlowChips.
- Rankings: sortable world table, India rank history.
- Report card: A–F grade, per-category scores, India-vs-China radar, export.
- Methodology: sources, pipeline, caveats (both score formulas documented).
- Chat: RAG chatbot with citations.

### Technical features

- Server components first; client components for interactivity.
- TF-IDF local search (memoized index, no API key).
- Groq RAG chat with citations + runtime model resolution.
- D3 choropleth world map with year/indicator selectors.
- Scatter correlation with Pearson r.
- Print/CSV export.
- Motion-based flow chips.

### Security features

Middleware rate limiting, CSP + security headers, param validation, sanitized errors. See `15`.
