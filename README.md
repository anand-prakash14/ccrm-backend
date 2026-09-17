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

## Status

Schema and migrations provisioned (CA-137). API endpoints are being added story-by-story —
see Jira project **CA** for the full backlog and `plans/INDEX.md` for what has shipped.
