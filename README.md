# CCRM Backend — CRM API Service

Express/TypeScript backend for the CCRM Real Estate CRM pipeline (project **CA** in Jira).
Implements the CRM module described in `HLD-ccrm-v1.0` — the single REST API consumed by
both the Web Frontend and (via the MCP Server) the conversational agent.

Built story-by-story against Jira; see `plans/` for the approved LLD behind each change.

## Tech Stack

Express 4 · TypeScript 5 (strict) · TypeORM 0.3 · PostgreSQL 16 · Redis 7 (`ioredis`) ·
Zod · JWT (`jsonwebtoken`) · `pino` · Jest + Supertest · npm.

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start local Postgres + Redis
docker-compose up -d

# 3. Configure environment
cp .env.example .env
# edit .env if needed — defaults match docker-compose.yml

# 4. Run migrations
npm run migration:run

# 5. Start the dev server (available once the first API story adds src/main.ts)
npm run dev
```

## Common Commands

| Task | Command |
|---|---|
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Format | `npm run format` |
| Run tests | `npm test` |
| Run tests with coverage | `npm run test:coverage` |
| Generate a migration | `npm run migration:generate -- migrations/<Name>` |
| Apply migrations | `npm run migration:run` |
| Revert last migration | `npm run migration:revert` |

The migration integration test (`tests/migrations/schema.integration.test.ts`) runs the
real TypeORM CLI against a dedicated `ccrm_test` database (created automatically by
`docker-compose up` via `docker/postgres-init/01-init-test-db.sql`) — start the datastores
with `docker-compose up -d` before running `npm test`.

## Project Layout

```
src/
  routes/        Express Router wiring
  controllers/   Request handlers
  services/      Business logic layer
  repositories/  Data access layer (TypeORM)
  entities/      TypeORM entity classes
  dto/           Zod schemas + inferred types
  cache/         Redis cache utilities
  middleware/    Auth guards, validation, error handling
  config/        Env schema, DataSource, logger, DI container
  errors/        Domain error classes
migrations/      TypeORM migration files
tests/           Jest test suite
plans/           Agent-produced LLD documents, one directory per Jira story
```

## Bootstrap Admin

Migration `SeedBootstrapAdmin` seeds one Admin account so the system is loggable-into
before CA-122 (Admin creates a user) exists:

```
email:    admin@ccrm.local
password: ChangeMe@123
```

Dev-only. Rotate immediately in any shared or non-local environment.

## Manual Smoke Test

`scripts/smoke-test.mjs` exercises the full lead pipeline end-to-end (create, stage
advancement, site visits, conclusion, RBAC, reassignment, activity log, dashboard) against
a running dev server:

```bash
npm run dev   # in one terminal

# in another — SALESMAN_ROLE_ID from: SELECT id FROM role WHERE name='SalesMan';
SALESMAN_ROLE_ID=<uuid> node scripts/smoke-test.mjs
```

## Agent-Initiated Tagging (CA-121)

`activity_log.is_agent_initiated` is set server-side from a validated `X-Agent-Service-Key`
header matched against the `AGENT_SERVICE_KEY` env var — never from a client-supplied flag
(spoofable). Only the not-yet-built MCP Server (Agents module) would be configured with
this key; until then, `AGENT_SERVICE_KEY` is unset and every write is UI-initiated.

## Status

Schema, migrations, auth, user management, and the full lead pipeline (CA-137, CA-42,
CA-138, CA-122, CA-123, CA-2, CA-10, CA-17, CA-24, CA-25, CA-26, CA-27, CA-28 backend half,
CA-29, CA-43, CA-66, CA-67, CA-83, CA-84, CA-92, CA-93, CA-94, CA-121, CA-95/96/112
satisfied by design — same JWT/RBAC path for every caller) are done. Remaining: CA-141
(containerize), CA-142 (rest of observability). CA-113/114/136/139/140 belong to the
Agents module (Python/Google ADK) — out of scope for this Node backend. See Jira project
**CA** for the full backlog and `plans/INDEX.md` for what has shipped. Per current
direction, most stories from here on skip the full Jest suite until a dedicated testing
pass; verification is `tsc`/`eslint` plus the manual smoke test above.
