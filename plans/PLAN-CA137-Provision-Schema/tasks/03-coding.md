# Task 03 — Coding

**Status:** Completed

## Gates cleared
- Gate 1 (Approved LLD): user typed "approved" in conversation — plan.md.
- Gate 2 (Explicit handoff): Orchestrator → Coding Agent, this session.
- Gate 3 (Git branch): `git init` + `git checkout -b CA-137-provision-schema` — Created.

## Jira Status Skill
- Target: `In Progress`. No transition literally named "In Progress" exists on this
  workflow; used the semantically equivalent "Start Dev" transition, which moves the
  issue to status "In Development" (statusCategory: In Progress / yellow). Result: Transitioned.

## Files created (per plan §2.1)
- [x] `package.json`, `tsconfig.json`, `.eslintrc.json`, `.prettierrc`, `jest.config.js`, `.env.example`, `.gitignore`, `README.md`
- [x] `docker-compose.yml` + `docker/postgres-init/01-init-test-db.sql`
- [x] `src/config/env.ts`, `src/config/logger.ts`, `src/config/data-source.ts`
- [x] `src/entities/Role.entity.ts`, `AppUser.entity.ts`, `Lead.entity.ts`, `SiteVisit.entity.ts`, `Conclusion.entity.ts`, `ActivityLog.entity.ts`
- [x] `src/entities/transformers/decimal.transformer.ts` (not in original plan list — added so DECIMAL(19,4) columns surface as `number`, not TypeORM's default `string`, without weakening precision; documented as a deviation below)
- [x] `migrations/1758096000000-InitSchema.ts`, `migrations/1758096000001-SeedRoles.ts`
- [x] `src/errors/app.errors.ts` (base `AppError` + `NotFoundError`/`UnauthorizedError`/`ForbiddenError`/`ValidationError`/`BadRequestError` — plan only called for a stub; added the common subclasses used by the coding-agent's own Error Standards example so later stories don't redefine them)
- [x] `tests/setup-env.ts`, `tests/migrations/schema.integration.test.ts`

## Deviations from plan
1. **Migration test strategy**: plan said "spin up migrations against a test Postgres
   instance ... assert via `information_schema`". Implemented via the real TypeORM CLI
   (`typeorm-ts-node-commonjs migration:run` / `migration:revert`, invoked as a child
   process against `TEST_DATABASE_URL`) rather than an in-process TypeORM `DataSource`
   with `migrations: ['migrations/*.ts']` run inside Jest — `ts-jest`'s module loader
   does not reliably resolve TypeORM's internal glob-based `.ts` migration loading at
   runtime. The CLI-based approach is more robust and exercises the exact commands a
   developer/operator actually runs.
2. Added `decimalTransformer` (not listed in plan §2.1) — needed so DECIMAL(19,4) money
   columns deserialize to `number` at the entity boundary consistently, per the coding
   standard's "type annotations everywhere" rule; without it TypeORM returns numeric
   columns as `string`.
3. `src/errors/app.errors.ts` includes the common subclasses (`NotFoundError`, etc.), not
   just a bare `AppError` stub — these are needed verbatim by the Coding Agent's own
   Error Standards template and every subsequent story will need them; adding them now
   avoids re-touching this file in every future plan.

## Verification (to fill in after `npm install`)
- [ ] `npx tsc --noEmit`
- [ ] `npx eslint src tests --ext .ts`
- [ ] `npx prettier --check src tests`

## Environment blockers hit and resolved (2026-09-17)
1. **npm registry TLS.** `npm install` hung — this network routes HTTPS through a
   Fortinet SSL-inspection proxy (`registry.npmjs.org`'s chain was signed by
   `FortiGate CA`) that wasn't trusted by this machine. Resolved once the user/IT
   installed the FortiGate root CA; no insecure workaround was applied.
2. **No Docker on this machine.** The plan's `docker-compose.yml` (Postgres 16 + Redis 7)
   can't be used here. A native PostgreSQL 17 Windows service was already running
   locally; with the user's permission and the `postgres` superuser password, created a
   dedicated `ccrm` login role plus `ccrm` (dev) and `ccrm_test` (integration test)
   databases owned by it — nothing else on that instance was touched. `docker-compose.yml`
   is kept as-is for any environment that does have Docker (e.g. CI); local dev on this
   machine uses the native instance instead. Redis is not required by this story.
3. **`@/` path alias not resolved by the TypeORM CLI.** `typeorm-ts-node-commonjs` runs
   migrations via `ts-node` directly, which doesn't pick up `tsconfig-paths` on its own.
   Fixed by adding a `"ts-node": { "require": ["tsconfig-paths/register"] }` block to
   `tsconfig.json` (not in the original plan — necessary for `npm run migration:run`/
   `migration:revert` to work at all).
4. **`execFileSync('npx', ...)` → ENOENT on Windows** inside the integration test —
   `npx` resolves to `npx.cmd` on Windows and isn't directly spawnable without a shell.
   Fixed by invoking the TypeORM CLI's JS entrypoint
   (`node_modules/typeorm/cli-ts-node-commonjs.js`) directly via `process.execPath`,
   which is portable across platforms.

## Final verification — all green
- [x] `npx tsc --noEmit` — no errors
- [x] `npx eslint src tests --ext .ts` — no errors
- [x] `npx prettier --check src tests` — clean
- [x] `npm run migration:run` against the real `ccrm` database — all 6 tables, 6 indexes,
      and both enum-backed and role-seed data created successfully
- [x] `npx jest` — 4/4 tests passing in `tests/migrations/schema.integration.test.ts`
      (table existence, index existence, role seed content, full revert-twice-then-reapply
      cycle proving both migrations' `down()` work)
