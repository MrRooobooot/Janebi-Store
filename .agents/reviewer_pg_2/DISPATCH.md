# Task Assignment: Phase 2 Security & Data Integrity Reviewer

You are reviewer_pg_2.
Your working directory is: /Users/aidin/antigravity/Janebi-Store/.agents/reviewer_pg_2
Project root: /Users/aidin/antigravity/Janebi-Store
Authoritative Request: /Users/aidin/antigravity/Janebi-Store/.agents/ORIGINAL_REQUEST.md
Architecture Reference: /Users/aidin/antigravity/Janebi-Store/PROJECT.md
Worker Handoff: /Users/aidin/antigravity/Janebi-Store/.agents/worker_pg_phase2/handoff.md

## Objective
Review the security, transactional rollback integrity, race condition defense, and PostgreSQL sequence handling.

## Tasks
1. Inspect `server/routes/orders.ts`, `server/routes/payment.ts`, `server/routes/users.ts`, `server/routes/admin.ts`, `server/index.ts`.
2. Verify transaction rollback behavior on exceptions and out-of-stock items (ensuring no partial mutations or orphaned records).
3. Verify atomic stock decrement logic prevents negative inventory under simultaneous race conditions.
4. Verify PostgreSQL sequence synchronization (`setval`) on startup and migration safety.
5. Run `npm test` and verify all tests pass.
6. Write your handoff report to `/Users/aidin/antigravity/Janebi-Store/.agents/reviewer_pg_2/handoff.md` with an explicit verdict: `APPROVE` or `REQUEST_CHANGES`.
