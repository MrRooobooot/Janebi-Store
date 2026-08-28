# NEXUS Multi-Agent Orchestration & Operating System Implementation Plan

> **For Hermes:** Use subagent-driven-development and multi-agent coordination (`nexus-orchestration` skill) to execute and govern this framework.

**Goal:** Establish an autonomous, verifiable, and strictly orchestrated multi-agent development and quality-assurance system for Janebi Store where Atlas functions exclusively as Technical Lead & Orchestrator directing specialist agents.

**Architecture:** 10-phase pipeline (Understand → Plan → Assign → Parallelize → Monitor → Review → Correct → Verify → Integrate → Report) backed by role isolation, peer-review gates, automated regression testing, and live production verification on `janebiarena.ir`.

**Tech Stack:** Hermes Agent Profiles (Atlas, Cipher, Vega, Quant, Forge, Rook, Librarian, Pulse, Muse), React 19, Express 5, Drizzle ORM, Vitest, Playwright, Docker, Nginx.

---

## 1. Multi-Agent Roles & Delegation Matrix

| Agent | Profile Name | Primary Specialization | Delegation Trigger |
|---|---|---|---|
| **Atlas** | `atlas` | Orchestrator, Tech Lead, Release Manager | Root coordination, task decomposition, final gatekeeping, deployment |
| **Cipher** | `cipher` | Research & Discovery | Industry benchmarks, WCAG standards, package evaluations, API docs |
| **Vega** | `vega` | Strategic Planning & CRO | Conversion rate optimization, user journey mapping, scenario analysis |
| **Quant** | `quant` | Quantitative Analysis | Pricing models, discount calculations, margin protection, shipping tiers |
| **Forge** | `forge` | Frontend & Backend Engineering | React 19 UI, Express 5 routes, Drizzle schemas, unit tests |
| **Rook** | `rook` | Red Team & Critical Review | Security review, edge-case probing, UX friction analysis, bug hunting |
| **Librarian** | `librarian` | Knowledge & Memory Management | Architecture records, long-term memory, Obsidian knowledge base sync |
| **Pulse** | `pulse` | Runtime & Infrastructure Monitoring | Health probes, VPS log inspection, cron routines, container metrics |
| **Muse** | `muse` | UX Copywriting & Storytelling | Authentic Persian microcopy, changelogs, customer-facing documentation |

---

## 2. Standard 10-Phase Operating Cycle

```text
[User Request]
       │
       ▼
Phase 1: UNDERSTAND (Atlas analyzes scope, boundaries, and acceptance criteria)
       │
       ▼
Phase 2: PLAN (Decompose into bite-sized 2-5 min tasks with explicit dependencies)
       │
       ▼
Phase 3: ASSIGN & BRIEF (Dispatch targeted briefs to specialized agents)
       │
       ▼
Phase 4: PARALLELIZE (Execute independent tasks concurrently via subagents/CLI)
       │
       ▼
Phase 5: MONITOR & EXTRACT (Collect structured JSON/markdown task reports)
       │
       ▼
Phase 6: PEER REVIEW (Independent cross-audit by Reviewer/Security/Red-Team agent)
       │
       ▼
Phase 7: CORRECTION PROTOCOL (Issue explicit correction tickets if defects found)
       │
       ▼
Phase 8: RIGOROUS VERIFICATION (Run full test suite: lint + vitest + e2e + build)
       │
       ▼
Phase 9: INTEGRATION & DEPLOY (Atomic Git commit, push, rsync, docker recreate)
       │
       ▼
Phase 10: CONCISE REPORT (Deliver verified outcome + live URL to User)
```

---

## 3. Bite-Sized Task Decomposition & Execution Plan

### Task 1: Governance & Standard Task Report Protocol
**Objective:** Define and enforce the universal machine-readable report format that all agents must return.
**Files:**
- Create: `.hermes/templates/agent-task-report.md`
- Test: `.hermes/templates/agent-task-report.test.md`

**Step 1: Define Report Schema**
```markdown
TASK: [Exact Subtask Name]
STATUS: [DONE | PARTIAL | BLOCKED | FAILED]
CHANGES:
- [Itemized delta 1]
- [Itemized delta 2]
FILES_TOUCHED:
- [Absolute or relative paths]
TESTS_EXECUTED:
- [Test file & result: e.g. vitest run -> 288/288 passed]
VERIFICATION_EVIDENCE:
- [Live output, HTTP status code, or console log]
SECURITY_AUDIT:
- [RBAC/Auth/IDOR check status]
RISKS_IDENTIFIED:
- [Any regressions or trade-offs]
```
**Step 2: Verify Format Integration**
Validate template presence and inject into agent system prompts across all profiles.

---

### Task 2: Peer-Review & Correction Ticketing System
**Objective:** Create an automated peer-review gate so no code change authored by `@Forge` merges without review by `@Rook` or `@Vega`.
**Files:**
- Create: `.hermes/templates/correction-ticket.md`
- Modify: `agent.md` (Update Verification & Review Gate sections)

**Step 1: Draft Correction Protocol**
```markdown
CORRECTION REQUIRED
Source Agent: @Rook / @Vega
Target Agent: @Forge
Issue Description: [Exact discrepancy or vulnerability]
Severity: [CRITICAL | HIGH | MEDIUM | LOW]
Expected Fix: [Concrete technical requirement]
Verification Gate: [Must pass unit test + live re-audit]
```
**Step 2: Implement Gate in Atlas Dispatch Loop**
Atlas automatically spawns `@Rook` for code review upon completion of any multi-file feature.

---

### Task 3: Automated Multi-Gate Verification Pipeline
**Objective:** Enforce zero-stub, zero-regression verification before every deployment.
**Commands & Gates:**
1. `npm run lint` (TypeScript typecheck — must exit 0)
2. `npm test` (Vitest test suite — 288+ tests must pass)
3. `npm run build` (Vite client + esbuild server bundle — must generate cleanly in `dist/`)
4. Container Volume Parity (Verify `dist/` and `.env` synchronization with Docker container)
5. Live Health Probe: `curl -s https://janebiarena.ir/api/health` (HTTP 200, status="ok", database="ok")

---

### Task 4: Knowledge Capture & Obsidian Memory Sync
**Objective:** Instruct `@Librarian` to archive architectural milestones and decisions into `.hermes/reports/` and user knowledge base.
**Files:**
- Modify: `agent.md` (Keep synchronized as Single Source of Truth)
- Modify: `CHANGELOG_AGENT.md` (Log all added, changed, and verified items)

---

## 4. Risks, Tradeoffs & Rules of Engagement

1. **Risk:** Subagent drift or hallucinations in task completion self-reports.
   - **Mitigation:** Atlas never accepts verbal "Done"; Atlas runs the tests and inspects real diffs.
2. **Risk:** Production container desynchronization (`dist` mismatch).
   - **Mitigation:** Direct volume mount (`./dist:/app/dist`) and explicit Docker container recreation verified with live asset header checks.
3. **Risk:** Unintended disruption of live checkout or payment flows.
   - **Mitigation:** Zero mock policy; offline gated payments with 503 fallback; COD flow fully active.

---

## 6. Framework Self-Correction & Missing Capability Fixes
- **Weakness Found during Dry-Run:** In multi-bot CLI executions (`hermes -p bot chat -q`), long prompts with unescaped backticks or missing quotes could cause code snippet ingestion errors.
- **Correction Applied:** Standardized on strict file-based task passing and isolated parameter escaping for subagent delegation.
- **RTL Animation Invariant:** All drawer/slide-over animations must explicitly use negative offsets (`-100%`) or CSS logical properties (`inset-inline-start`) to prevent layout inversion on RTL/LTR switching.

Plan complete and saved to `.hermes/plans/2026-08-28_194500-team-orchestration-framework.md`. Ready to execute subsequent development cycles under strict Orchestrator governance.
