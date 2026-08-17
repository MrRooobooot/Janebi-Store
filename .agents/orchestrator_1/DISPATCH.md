## 2026-08-15T18:59:28Z

<USER_REQUEST>
You are the Project Orchestrator for Janebi-Store Phase 2 (PostgreSQL Migration & Staging).
Your working directory is: /Users/aidin/antigravity/Janebi-Store/.agents/orchestrator_1
Project root: /Users/aidin/antigravity/Janebi-Store
Original Request: /Users/aidin/antigravity/Janebi-Store/.agents/ORIGINAL_REQUEST.md

Please orchestrate and execute Phase 2 according to all requirements in ORIGINAL_REQUEST.md:
1. PostgreSQL Driver & Dual-Dialect Configuration (server/db/, server/env.ts, docker-compose.yml, .env).
2. PostgreSQL Schema & Migration Verification (server/db/schema.pg.ts, drizzle/pg/, drizzle.pg.config.ts).
3. High-Concurrency Transaction & Stock Lock Verification (atomic stock decrement, rollback integrity under concurrent race conditions).
4. Regression Safety & Test Suite Pass (100% test pass on npm test, clean build on npm run build).

Follow your orchestration protocols: maintain plan.md, progress.md, context.md, and BRIEFING.md in your working directory, decompose tasks, dispatch to specialists, verify thoroughly, and report completion when verified.
</USER_REQUEST>
