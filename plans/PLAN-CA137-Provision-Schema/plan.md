# LLD — CA-137: Provision CRM database schema and migrations

| Field | Value |
|---|---|
| Jira | [CA-137](https://experionglobal.atlassian.net/browse/CA-137) |
| Story | As a developer, I want the CRM Database's schema provisioned via versioned migrations, so every other CRM module story has a real data store to build against. |
| Source | HLD-ccrm-v1.0 — Technical Architecture § Datamodel/ERD |
| Related | CA-42 (role modeled as data — satisfied by this schema, handled as a follow-up confirmation-only story) |
| Status | Draft — awaiting approval |

---

## 1. Context (Knowledge Agent findings)

- No existing repo at `C:\sparc_hackathon\ccrm-backend` — this is a first commit / greenfield scaffold.
- Tech stack and folder layout are fixed by `CCRM/coding agents/backend-node-agent/CLAUDE.md`: Express 4, TypeScript 5 (strict), TypeORM 0.3.x, PostgreSQL 16.x, Redis 7 (`ioredis`), Zod, JWT, `pino`, Jest + Supertest, npm.
- Schema, field list, types, FKs and indexes are fully specified in `docs/architecture/HLD-ccrm-v1.0.md` § Datamodel/ERD (mirrors the Confluence HLD — already fetched and cross-checked).
- No separate "Database Design" doc exists — the ERD in the HLD is authoritative.

## 2. Scope of Change

### 2.1 Files to CREATE

**Project scaffold**
- `package.json`, `tsconfig.json` (`strict: true`), `.eslintrc.json`, `.prettierrc`, `jest.config.js`, `.env.example`, `.gitignore`, `README.md`
- `docker-compose.yml` (Postgres 16 + Redis 7, for local migration/dev use — full app containerization is CA-141, this is just the dev datastore)

**Config layer**
- `src/config/env.ts` — Zod-validated env schema (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REDIS_URL`, `PORT`, `NODE_ENV`, `LOG_LEVEL`)
- `src/config/data-source.ts` — TypeORM `DataSource` (Postgres), migrations glob, entities glob
- `src/config/logger.ts` — `pino` structured logger

**Entities** (`src/entities/`)
- `Role.entity.ts`
- `AppUser.entity.ts`
- `Lead.entity.ts`
- `SiteVisit.entity.ts`
- `Conclusion.entity.ts`
- `ActivityLog.entity.ts`

**Migrations** (`migrations/`)
- `<timestamp>-InitSchema.ts` — creates `role`, `app_user`, `lead`, `site_visit`, `conclusion`, `activity_log` with all columns/types/FKs/indexes per HLD ERD, plus `up()`/`down()`
- `<timestamp>-SeedRoles.ts` — inserts exactly two rows into `role`: `SalesMan`, `Admin` (with `down()` deleting them)

**Misc**
- `src/errors/DomainError.ts` — base error class (used by later stories; stub now so entities/migrations compile cleanly against project conventions)
- `tests/migrations/schema.integration.test.ts` — spins up migrations against a test Postgres instance (via `DATABASE_URL_TEST` / testcontainers-free approach: connect to the `docker-compose` Postgres) and asserts all 6 tables + indexes exist, and `role` is seeded with exactly `SalesMan`/`Admin`

### 2.2 Files to MODIFY
None (greenfield).

### 2.3 Files to DELETE
None.

## 3. Data Model (per HLD, verbatim field list)

| Table | Key columns |
|---|---|
| `role` | `id` UUID PK, `name` VARCHAR(50) UNIQUE NOT NULL, `created_at` |
| `app_user` | `id` UUID PK, `name`, `email` CITEXT UNIQUE, `password_hash`, `role_id` FK→role, `is_active` BOOLEAN default true, `created_at`, `updated_at` |
| `lead` | `id` UUID PK, `name`, `phone`, `alternate_phone`, `email` CITEXT, `source`, `stage` default `'Enquiry'`, `property_type`, `preferred_locations`, `lead_temperature`, `assigned_saleman_id` FK→app_user, `budget_min`/`budget_max` DECIMAL(19,4), `purpose`, `financing_status`, `purchase_timeline`, `requirement_notes` TEXT, `created_by` FK→app_user NOT NULL, `created_at`, `updated_at` |
| `site_visit` | `id` UUID PK, `lead_id` FK→lead ON DELETE CASCADE, `scheduled_at` TIMESTAMPTZ, `property_project`, `units`, `accompanying_saleman_id` FK→app_user, `status` default `'Scheduled'`, `visit_feedback` TEXT, `created_at` |
| `conclusion` | `id` UUID PK, `lead_id` FK→lead ON DELETE CASCADE UNIQUE, `outcome`, `unit_booked`, `booking_token_amount` DECIMAL(19,4), `sale_price` DECIMAL(19,4), `booking_date` DATE, `lost_reason`, `notes` TEXT, `created_at` |
| `activity_log` | `id` UUID PK, `lead_id` FK→lead ON DELETE CASCADE, `entry_type`, `content` TEXT, `actor_user_id` FK→app_user, `is_agent_initiated` BOOLEAN default false, `created_at` |

**Indexes:** `idx_app_user_role_id`, `idx_lead_assigned_saleman_id`, `idx_lead_stage`, `idx_lead_source`, `idx_site_visit_lead_id`, `idx_activity_log_lead_id_created_at (lead_id, created_at)`.

**Types:** UUID PKs via `gen_random_uuid()` (requires `pgcrypto` extension, enabled in the init migration); all timestamps `TIMESTAMPTZ`; all money fields `DECIMAL(19,4)` — never `FLOAT`, per HLD explicit callout.

## 4. Migration Strategy

- TypeORM migrations, run via `npx typeorm migration:run -d src/config/data-source.ts`.
- `InitSchema` migration is one file covering all 6 tables in FK-safe creation order (`role` → `app_user` → `lead` → `site_visit`/`conclusion`/`activity_log`), with a `down()` that drops them in reverse order. Enables `pgcrypto` extension in `up()`, does not disable it in `down()` (shared extension, safe to leave).
- `SeedRoles` migration is separate from `InitSchema` (seed data vs. DDL are kept in different migrations per TypeORM convention) — inserts `SalesMan` and `Admin` only; `down()` deletes both by name.
- Both migrations get a tested `down()` per the story's explicit acceptance criterion — verified in the integration test by running `migration:run` then `migration:revert` twice and re-running.

## 5. Testing Plan

- `tests/migrations/schema.integration.test.ts`: fresh DB → run migrations → assert all 6 tables exist with expected columns (via `information_schema`) → assert the 6 named indexes exist → assert `role` table contains exactly `{SalesMan, Admin}` → run `migration:revert` twice → assert tables are gone.
- No unit tests for entities themselves at this stage (they're TypeORM metadata classes, exercised by the migration/repository tests in later stories).

## 6. Out of Scope (deferred to later stories, do not implement now)

- Any HTTP route/controller/service/repository — this story is schema-only.
- Redis wiring beyond the env schema placeholder.
- Full Docker Compose for all app containers (CA-141).

## 7. Risks / Open Items carried from HLD

- PostgreSQL as engine is `[INFERRED]`, not stakeholder-confirmed (HLD Open Item) — proceeding with Postgres 16 per HLD since it's the only documented decision.
- Money fields use `DECIMAL(19,4)` intentionally, not `FLOAT`.

---

**Awaiting your review.** Reply with any changes you want, or type `Approved` exactly to proceed to coding.
