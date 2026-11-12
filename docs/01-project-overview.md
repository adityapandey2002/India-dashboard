# 01 — Project Overview

## Name

**India in the World — Global Progress Dashboard** (`india-dashboard`).

## What it does

A full-stack web dashboard that tracks India's standing across 123 registered global
indicators (117 currently with data — economy, health, education, environment, governance,
technology, equality, safety, digital government) sourced from public datasets (World Bank,
WHO, UNDP, OWID, WGI, Transparency International, Numbeo, and ~30 more).

## Problem it solves

There is no single, free, developer-friendly place that aggregates India's global rankings
across hundreds of indicators with consistent definitions, rankings, and history. This
dashboard consolidates them into one queryable, visual surface.

## Intended audience

- Citizens, journalists, researchers, policymakers tracking India's progress.
- Developers/agents extending the data layer or UI.
- Open-source contributors.

## Main value proposition

- Single registry of indicators (`src/lib/data/indicators.ts`) drives both ingestion and UI.
- Auto-detecting DB driver (SQLite local / Postgres remote) — same code path everywhere.
- Server components first → fast first paint, SEO-friendly.
- Free-first stack (local SQLite, free-tier Vercel, free Groq/HuggingFace APIs).

## Project status

- Version `0.1.0`, private, MIT license stated in README.
- Built for "Development Challenge 2026".
- Local dev fully functional on SQLite (all pages verified 200).
- Production DB story blocked: original Supabase host dead (see AGENTS.md Known issues).

## Implemented vs planned

- Implemented: home, explore, indicator detail, country profile, compare, rankings, report card, methodology, chat, 9 API routes.
- Not implemented: authentication/users, production PG DB.
- 6 of 123 indicators currently have 0 data points locally (broadband_speed, ccpi, digital_competitiveness, epi, qs_rank, startup_ecosystem).
