# Code Review Report — PLAN-CA137-Provision-Schema

**Date:** 2026-09-17
**Reviewer:** Code Review Agent
**Decision:** Go

## Plan Compliance

- Checksum (plan §2.1): 19 CREATE / 0 MODIFY / 0 DELETE
- Actual: 21 CREATE / 0 MODIFY / 0 DELETE
- Deviations:
  - `src/entities/transformers/decimal.transformer.ts` — not in original plan; needed so `DECIMAL(19,4)` columns surface as `number` at the entity boundary instead of TypeORM's default `string`. Documented in `tasks/03-coding.md`. Accepted.
  - `src/errors/app.errors.ts` includes `NotFoundError`/`UnauthorizedError`/`ForbiddenError`/`ValidationError`/`BadRequestError` subclasses, not just a bare `AppError` stub as the plan implied. These are exactly the subclasses the Coding Agent's own Error Standards template requires; adding them now avoids re-touching this file every future story. Accepted.
  - `docker/postgres-init/01-init-test-db.sql` — not separately itemized in the plan, but is a direct, necessary extension of the plan's listed `docker-compose.yml` (creates the `ccrm_test` database the plan's own Testing Plan section requires). Accepted.
  - Testing strategy deviation (plan §5 said assert via an in-process `DataSource` + `information_schema`; implemented via the real TypeORM CLI invoked as a child process instead) — documented in `tasks/03-coding.md` with rationale (`ts-jest` does not reliably resolve TypeORM's internal glob-based `.ts` migration loading at runtime). Accepted — this is a stronger test, not a weaker one, since it exercises the exact commands a developer/operator runs.

No file listed as CREATE is missing. No unplanned route/controller/service/repository code exists — correctly out of scope per plan §6.

## Findings

### Critical
None.

### Major
None.

### Minor
None.

### Suggestions

- `migrations/1758096000000-InitSchema.ts:22` — the `up()`/`down()` methods are ~140/~20 lines respectively, over the 30-line code-quality guideline. Acceptable here: this is DDL for one atomic schema migration (all 6 tables must be created together inside one transaction), and splitting it into helper methods would not meaningfully improve clarity. No action needed.
- Consider adding a short CONTRIBUTING note (or a section in README) on the two environment adjustments this machine needed (native Postgres role/db instead of Docker, `NODE_EXTRA_CA_CERTS` for the corporate TLS proxy) so the next developer who hits the same network doesn't have to rediscover it. Optional — can fold into a later DevOps/CA-141 story instead.

## Checklist Results

- **TypeScript Type Checklist:** Pass — no `any`, all functions explicitly typed, no unjustified `as`/`!`/`@ts-ignore`, `npx tsc --noEmit` clean under `strict: true`.
- **TypeORM Entity Checklist:** Pass — every column has a decorator, all 6 tables use UUID PKs, every enum-shaped field (stage, source, site-visit status, conclusion outcome, lost reason, activity-log entry type) is backed by a TS `enum`; fields the HLD does not give a fixed value list for (`property_type`, `preferred_locations`, `lead_temperature`, `purpose`, `financing_status`, `purchase_timeline`) are correctly left as plain `varchar`, not invented enums. `nullable: true` only where the HLD marks a field NULL. Explicit `@Entity('table_name')` on all 6.
- **Migration Checklist:** Pass — both migrations have implemented, tested `down()`; every entity-declared index (`idx_app_user_role_id`, `idx_lead_assigned_saleman_id`, `idx_lead_stage`, `idx_lead_source`, `idx_site_visit_lead_id`, `idx_activity_log_lead_id_created_at`) is present in `up()` and verified by the integration test; every enum type created in `up()` is dropped in `down()`; hand-written and reviewed, not unreviewed generator output.
- **Security Checklist:** Pass — no hardcoded secrets (`JWT_SECRET`/`DATABASE_URL` sourced from env with no defaults, per `env.ts`'s Zod schema); `.env` is git-ignored; no raw string-concatenated SQL with interpolated *values* (migration DDL has no parameters — table/column/type names are fixed literals, not user input); no `eval`/unsafe deserialization.
- **Performance Checklist:** Pass — `DataSource.poolSize` is wired from `DB_POOL_MAX` (confirmed against TypeORM's `PostgresDriver` source: `poolSize` maps to the underlying `pg` Pool's `max`); every HLD-specified index is present; no N+1 risk (no query code yet in this schema-only story).
- **Code Quality Checklist:** Pass aside from the migration-length Suggestion above. No `console.log`, no commented-out code, no magic strings (enum/constant values are the literal HLD-specified business values, appropriately inline in DDL).
- Not applicable this story (no code in these layers yet): Express Route & Controller, Service Layer, Repository Layer, Zod DTO, Redis Cache, Async Correctness (beyond what's checked above), Error Handling middleware wiring.

## Verification Evidence

- `npx tsc --noEmit` — clean
- `npx eslint src tests --ext .ts` — clean
- `npx prettier --check src tests` — clean
- `npm run migration:run` against a real PostgreSQL 17 database — all 6 tables, 6 indexes, 2 seed rows created successfully
- `npx jest` — 4/4 passing (table existence, index existence, seed content, full revert-twice-then-reapply cycle)

## Summary

Clean, well-scoped implementation that matches the HLD's ERD field-for-field and stays strictly within the story's schema-only boundary — no premature routes/services/controllers. The two environment deviations (no Docker → native Postgres role; CLI-based migration test instead of in-process TypeORM) are pragmatic, documented, and don't weaken what the story's acceptance criteria require. No Critical or Major findings. **Go** — proceed to Unit Test Agent (note: for this story the "unit tests" *are* the migration integration test already written and passing; no additional service/repository/controller test layers apply since none of that code exists yet).
