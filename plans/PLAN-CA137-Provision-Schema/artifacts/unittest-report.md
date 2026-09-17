# Unit Test Report — PLAN-CA137-Provision-Schema

**Date:** 2026-09-17
**Result:** PASS — 11/11 tests green

## Suites

### `tests/migrations/schema.integration.test.ts` (4 tests)

Drives the real TypeORM CLI (`typeorm-ts-node-commonjs migration:run`/`migration:revert`)
against a dedicated `ccrm_test` PostgreSQL database — proving the actual commands a
developer/operator runs, not just an in-process approximation.

| Test | Corner case covered |
|---|---|
| creates all 6 HLD tables | Happy path — schema provisioning from empty DB |
| creates all 6 HLD-specified indexes | Every index named in the HLD exists, not just the tables |
| seeds the role table with exactly SalesMan and Admin | Seed data exact-match (not "at least these two") |
| reverts cleanly: down-migrations remove both seeded roles and all tables | `down()` correctness for both migrations, in reverse-application order, including the intermediate state (SeedRoles reverted but InitSchema not yet — tables still exist, role rows don't) |

### `tests/unit/decimal.transformer.test.ts` (7 tests)

The one pure utility function introduced this story — DTO/service/repository/controller
test layers from the standard checklist don't apply yet (none of that code exists).

| Test | Corner case covered |
|---|---|
| `to`: number passes through unchanged | Happy path |
| `to`: null passes through unchanged | Null handling |
| `to`: undefined passes through unchanged | Undefined handling |
| `from`: numeric string → number | Happy path (DB → app direction) |
| `from`: null → null | Null handling |
| `from`: undefined → null | Undefined handling |
| `from`: realistic DECIMAL(19,4) money value preserves precision | Guards against float drift on real sale-price-shaped values |

## Coverage

| File | Stmts | Branch | Funcs | Lines | Against minimum |
|---|---|---|---|---|---|
| `src/entities/transformers/decimal.transformer.ts` | 100% | 100% | 100% | 100% | Utility functions: 100%/100% — **met** |
| `src/entities/*.ts` (6 entity files) | 0% | 0–100% | 0% | 0% | No category applies (data-shape classes, no logic; exercised structurally by the migration test via the schema they generate, not by direct import) |
| `src/config/env.ts`, `logger.ts` | 0% | 100% | 100% | 0% | No category applies yet — no service/controller imports them in this story |
| `src/errors/app.errors.ts` | 0% | — | — | 0% | No category applies yet — no service/controller throws these yet; will be exercised once the first endpoint story lands |

No Services, Repositories, Controllers, Cache helpers, or Auth flows exist yet in this
story, so their respective coverage minimums (90/85%, 85/80%, 85/80%, 90/85%, 95/95%) are
not applicable — they will be enforced starting with the first story that introduces
those layers.

## Test Quality Checklist

- [x] Happy path covered
- [x] Not-found / empty-state equivalent covered (role table empty after full revert)
- [x] Exact-match assertions used where the acceptance criterion says "exactly" (role seed)
- [x] Edge cases (null/undefined) covered for the one pure utility
- [x] No flaky/timing-dependent assertions — CLI invocations are synchronous (`execFileSync`) and each test awaits its own DB client lifecycle
- [x] Test database (`ccrm_test`) is isolated from the dev database (`ccrm`) — verified by inspecting both DBs after the run

## Decision

**PASS.** Proceeding to: Jira → In Development is already set; transition to Done next
(no distinct "Done" transition name exists on this workflow — see `tasks/03-coding.md`
note on "Start Dev"; will use the closest equivalent and document it), Jira comment, and
GitHub PR skill (no `git remote`/GitHub repo configured yet for this brand-new local repo
— will report that limitation rather than silently skipping).
