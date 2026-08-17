# Task Assignment: Database & Dual-Dialect Survey

You are explorer_pg_survey_1.
Your working directory is: /Users/aidin/antigravity/Janebi-Store/.agents/explorer_pg_survey_1
Project root: /Users/aidin/antigravity/Janebi-Store
Authoritative Request: /Users/aidin/antigravity/Janebi-Store/.agents/ORIGINAL_REQUEST.md

## Objective
Investigate the current database connection layer and environment configuration for PostgreSQL & SQLite dual-dialect capability.

## Tasks
1. Inspect `server/db/`, `server/env.ts`, `docker-compose.yml`, `.env`, `.env.example`, `server/index.ts`.
2. Analyze how database connection is currently initialized and exported.
3. Determine what is needed to support:
   - Dynamic dialect switching: PostgreSQL (via `pg` Pool) when `DATABASE_URL` is a Postgres URI, and `better-sqlite3` when running offline/unit tests or with SQLite file path.
   - Proper typing/export of `db` so downstream routes and queries work seamlessly.
   - Docker & staging environment configuration (`docker-compose.yml`, `.env`).
4. Write your comprehensive analysis and recommendations to `/Users/aidin/antigravity/Janebi-Store/.agents/explorer_pg_survey_1/handoff.md`.
