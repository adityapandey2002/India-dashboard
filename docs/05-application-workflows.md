# 05 — Application Workflows

## Data ingestion workflow

1. Run `npm run ingest` (or `ingest:new`).
2. `scripts/ingest.ts` loads dotenv, seeds `sources`, `indicators`, `countries`.
3. For each source fetcher, fetches data and `bulkInsert`s into `data_points` (UPSERT on conflict).
4. Run `npm run index-embeddings` to build TF-IDF `embeddings` table.
5. Run `npm run status` to verify coverage.

## User request workflow (page render)

1. Browser requests URL.
2. Next.js server component runs, calls `src/lib/db/queries.ts`.
3. Queries hit SQLite/PG, return typed data.
4. Server renders HTML, streams to browser.
5. Client components hydrate; interactive fetches (e.g. scatter) call `/api/*`.

## AI chat workflow

1. User submits question in `/chat`.
2. `POST /api/ai/chat` receives `{question, conversationHistory}`.
3. `vectorSearch(question)` runs TF-IDF over `embeddings` (up to 50k rows).
4. If no hits, `buildContext` gathers India data, global leaderboards, trends, country snapshots.
5. Matched `INDIA_EVENTS` appended.
6. Groq LLM called with assembled context; answer + `[source_id]` citations returned.

## Report card workflow

1. `/report-card` server component loads indicators, snapshot, history, ranks (India + China).
2. `indicatorScore(rank,total)` per indicator; per-category averages + grades.
3. Overall grade computed; India-vs-China radar; strongest/weakest; top-5 per category.
4. `ExportButtons` offers Print/PDF + CSV.

## Rankings workflow

1. `/rankings` loads indicators with data.
2. `RankingsClient` lets user pick indicator; fetches `/api/rankings?indicator=`.
3. Server computes rankings (competition ranking, ties share) + India rank history via `rankings.ts`.
4. Client renders sortable/searchable table + India rank cards + history chart.

## Country profile workflow

1. `/country/[iso3]` loads country, indicators, snapshot, history, latest ranks (country + India).
2. Computes overall score/grade, category scores, top/bottom performers.
3. Renders radar vs India, trend card (vs India) via `/api/indicators/series`.

## Scatter correlation workflow

1. `ScatterCard` (home) lets user pick two indicators.
2. Fetches `/api/scatter?x=&y=`.
3. Server joins latest values per country, computes Pearson r, highlights India.
4. Client renders scatter plot + percentile chips.
