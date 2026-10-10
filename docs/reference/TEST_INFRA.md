# E2E Test Infra: Janebi-Store

## Test Philosophy
- Requirement-driven, multi-tiered testing covering all happy paths, boundary values, error branches, concurrency race conditions, and transaction rollbacks.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Combinations + Real-World Application Workloads + Adversarial Stress Testing.

## Feature Inventory & Test Mapping
| # | Feature | Source | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross) | Tier 4 (Workload) |
|---|---------|--------|:----------------:|:-----------------:|:--------------:|:-----------------:|
| 1 | Auth & JWT RBAC | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Product Catalog & Search | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Cart & Wishlist | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | Coupon Calculation Engine | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | Order Placement & Stock Transactions | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 6 | Payment Callback & Restocking | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 7 | User Address Book & Profile | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 8 | Admin Management & RBAC | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 9 | Contact & Reviews | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 10| Concurrency & Lock Resilience | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Runner:** `vitest` with `supertest`
- **Execution:** `npm run test` or `npx vitest run`
- **Harness:** Centralized `createTestApp()` or isolated app with `errorHandler` mounted to properly validate 400 responses.
- **Pass/Fail Semantics:** Exit code 0, 100% tests passing, zero unhandled rejections, zero SQLite busy locks.

## Coverage Goals
- **Tier 1 (Feature Coverage):** ≥50 test cases covering isolated endpoint happy paths.
- **Tier 2 (Boundary & Corner Cases):** ≥50 test cases covering validation rules, empty payloads, 400/401/403/404 responses, negative/exceeded bounds.
- **Tier 3 (Cross-Feature Combinations):** Pairwise flows (e.g. coupon + address + stock + payment verify + admin status update).
- **Tier 4 (Real-World Application Scenarios):** Full customer lifecycle and admin order management workflows.
- **Tier 5 (Adversarial Stress & Race Conditions):** Multi-client parallel checkout racing on the last available unit in stock.
