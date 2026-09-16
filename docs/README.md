# docs/ — index

Read in this order: `../PROJECT_GRAPH.md` (canonical live map) → `../AGENTS.md`
(PRD/stack/category rules) → `../TASKS.md` (open work + round log).

## Living references (kept current, no dates in the name)
| File | What it is |
|------|-----------|
| `CATEGORY-TREE.md` | **SoT for the category tree** — closed list; no change without user approval. |
| `TEST_INFRA.md` | How the test tiers run (unit / api / concurrency / e2e) and what each isolates. |
| `TEST_READY.md` | Test-tier readiness checklist and current counts. |
| `architecture-baseline.md`, `auth-baseline.md`, `database-baseline.md`, `api-baseline.md`, `payment-baseline.md`, `deployment-baseline.md`, `inventory-baseline.md` | Per-domain baselines: the invariants each subsystem must keep. |
| `PROJECT_AUDIT.md` | Production-readiness audit (severity list + status). |
| `UI-AUDIT-LOG.md` | Running UI/UX round log — every claim carries its measured evidence. |
| `SECURITY-AUDIT-2026-09-14.md` | Security findings register (updated in place as items close). |
| `REAL-INVENTORY-0916.md`, `PRICE-POSITION-REPORT-0914.md` | Catalogue reality + pricing vs market, from the same import campaign. |
| `research/`, `seo/` | Domain research and the SEO handbook. |
| `business/` | Commercial documents (not engineering). |

## archive/
Dated one-shot reports and superseded specs, moved here on 2026-09-16:
`legacy-agent.md`, `DAILY-2026-09-13.md`, `ADMIN-CODE-REVIEW-2026-09-13.md`,
`admin-review-2026-09-01.md`, `TEST-RESIDUE-AUDIT-0916.md`,
`final-production-audit.md`, `PROJECT-architecture-spec-2026-09.md`
(formerly root `PROJECT.md` — superseded by `AGENTS.md` + `PROJECT_GRAPH.md`).

## Historical paths in this folder
Entries written before 2026-09-16 point at `scripts/probes/<name>.mjs`.
The tidy pass deleted ~50 dated scratch probes and regrouped the survivors
(`gate/`, `audit/`, `ops/`, `data/`, `oneoff/` — see `../scripts/README.md`).
Those log lines are left verbatim because they are the evidence record for
closed rounds; the probe that produced them is either in `scripts/audit/`
under a date-free name or was a one-off whose conclusion already lives in code,
tests, or `UI-AUDIT-LOG.md`.
