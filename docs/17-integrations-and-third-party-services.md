# 17 — Integrations and Third-Party Services

## Data sources (ingestion-time only)

World Bank API, WHO GHO, UNDP HDR, OWID (CO2 + curated + grapher), WGI (zipped), Transparency International CPI, Numbeo, UN E-Gov (WB Data360), SDG (SDSN), and composite indices: INFORM (HDX), WIPO GII, GPI, Yale EPI, NRI, AI Readiness, Social Progress Index, WEF GCI (via WB Data360), GovTech Maturity, Open Data (ODIN), E-Participation (QoG), Ease of Doing Business (WB archived).

## Runtime third-party

- **Groq** — LLM chat/insights (`GROQ_API_KEY`).
- **HuggingFace** — optional embeddings (`HF_API_KEY`).
- **Supabase** — optional Postgres (`DATABASE_URL`).

## Internal integrations

- TF-IDF vector search over `embeddings` table (local).
- `INDIA_EVENTS` curated events for chart annotations.

## No other integrations verified

Payment, email, analytics, etc. — not present.
