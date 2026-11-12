# 06 — Modules and Features

## Module map

### `src/lib/db` — Data access

- `client.ts` — driver auto-detect (SQLite/PG), `query`, `execute`, `bulkInsert`, migrations (schema creation).
- `queries.ts` — all app SQL: indicators, countries, data points, snapshots, ranks, leaderboards, coverage, stats.
- `types.ts` — `Country`, `Indicator`, `DataPoint`, `Source`, `Category` + row mappers.

### `src/lib/data` — Indicator registry & ingestion

- `indicators.ts` — 121 seeds + `READY_SOURCES` (35+). `getAvailableIndicators()` filters ready.
- `sources/*` — one fetcher per upstream (see 17).

### `src/lib/ai`

- `client.ts` — Groq LLM client (`chat`, `generateInsight`).
- `embeddings.ts` — optional HF embeddings.
- `vector-search.ts` — local TF-IDF search.
- `index.ts` — barrel.

### `src/lib` helpers

- `format.ts` — `fmtValue` compact formatting.
- `rankings.ts` — competition ranking helpers.
- `rank-direction.ts` — `isHigherBetter` map.
- `report-card.ts` — scoring/grading helpers.
- `historical-events.ts` — `INDIA_EVENTS`.
- `indicator-guides.ts` — plain-language guides.
- `utils.ts` — `cn` class merge.

### `src/app` — Pages & API

See `03-project-structure.md` and `08-api-documentation.md`.

### `src/components`

- `ui/*` — shadcn base-ui primitives.
- `dashboard/*` — feature widgets (map, charts, scatter, rankings, report card, etc.).
- `chat/chat-interface.tsx`, `site-nav.tsx`.

## Features

### Core data features

- 121 registered indicators across 10 categories.
- 217 countries, ~105k data points, 34 sources (local DB).
- Auto-detecting DB driver.

### User-facing pages

- Home: KPI grid (12), 4 trend charts, world map, scatter correlation, GDP leaderboard.
- Explore: category filter + search, coverage stats.
- Indicator detail: India snapshot, global rank, trend, guide, chart, events, top-10, related.
- Country profile: score/grade, radar vs India, top/bottom, trend vs India.
- Compare: multi-country line/bar/radar, deltas, table, AI insight.
- Rankings: sortable world table, India rank history.
- Report card: A–F grade, per-category scores, India-vs-China radar, export.
- Methodology: sources, pipeline, caveats.
- Chat: RAG chatbot with citations.

### Technical features

- Server components first; client components for interactivity.
- TF-IDF local search (no API key).
- Groq RAG chat with citations.
- D3 choropleth world map with year/indicator selectors.
- Scatter correlation with Pearson r.
- Print/CSV export.

### Security features

None beyond framework defaults; no auth. See `15`.
