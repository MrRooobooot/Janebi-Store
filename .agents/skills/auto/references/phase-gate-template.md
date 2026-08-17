# Phase Gate Report Template

```markdown
# Phase Gate Report: PHASE <N> — <Phase Name>

## 1. Summary
- **Phase Objective**: [Brief description]
- **Status**: [PASSED | BLOCKED | FAILED]
- **Execution Date**: YYYY-MM-DDTHH:MM:SSZ

## 2. Changes Made
### Modified Files
- `path/to/file1.ts`: [Summary of changes]
- `path/to/file2.ts`: [Summary of changes]

### Created Files
- `path/to/new_file.ts`: [Summary of purpose]

### Deleted Files
- (None or list)

## 3. Verification & Test Evidence
- **Unit Tests**: [X/X passed]
- **Integration Tests**: [X/X passed]
- **Concurrency Tests**: [X/X passed (e.g. 50 concurrent requests)]
- **Typecheck**: `PASS` (`tsc --noEmit` exit 0)
- **Build**: `PASS` (`npm run build` exit 0)

## 4. Security & Safety Evaluation
- **Server-Side Authorization**: [Verified server-side role/permission guards]
- **Input Validation**: [Schemas applied to all endpoints]
- **Secrets Redacted**: [Verified 0 secrets in code, logs, or responses]
- **Data Integrity**: [Transactions & foreign keys verified]

## 5. Rollback Strategy
- **Rollback Steps**:
  1. `git revert <commit-hash>`
  2. Run migration rollback if applicable (`npm run db:rollback`)
  3. Verify previous stable tests pass

## 6. Gate Decision
- [x] Implementation Complete
- [x] All Tests Passed
- [x] Typecheck & Build Clean
- [x] Acceptance Criteria Satisfied
- [x] No Regressions Detected

**Decision**: `PHASE <N> PASSED` ➔ Auto-advancing to `PHASE <N+1>`.
```
