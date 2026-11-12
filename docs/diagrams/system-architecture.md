# System Architecture Diagram

```mermaid
flowchart TD
  Sources[Public data sources] --> Ingest[scripts/ingest.ts]
  Ingest --> DB[(SQLite / Postgres)]
  DB --> Queries[src/lib/db/queries.ts]
  Queries --> Pages[src/app pages]
  Queries --> API[src/app/api routes]
  Pages --> UI[React UI]
  API --> UI
  UI --> Browser[Browser]
  Chat[/api/ai/chat] --> Search[TF-IDF vector search]
  Search --> DB
  Chat --> Groq[Groq LLM]
```
