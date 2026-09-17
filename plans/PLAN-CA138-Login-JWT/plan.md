# LLD — CA-138: Email/password login issuing JWT session tokens

| Field | Value |
|---|---|
| Jira | [CA-138](https://experionglobal.atlassian.net/browse/CA-138) |
| Status | Draft — awaiting quick approval |

## Scope

First endpoint story — also stands up the Express app bootstrap, DI container, and the
auth/validation/error middleware every later endpoint reuses. Introduces `bcryptjs`
(pure-JS, no native build step) for password hashing.

**New files:**
- `src/app.ts` — Express app: JSON body parsing, route mounting, error middleware last
- `src/main.ts` — bootstrap: init `AppDataSource`, `app.listen(env.PORT)`
- `src/config/container.ts` — DI wiring (module-level singletons per project convention)
- `src/middleware/error.middleware.ts` — maps `AppError`/`ZodError` → HTTP response, never leaks stack traces
- `src/middleware/validate.middleware.ts` — `validateBody`/`validateQuery`/`validateParams` Zod middleware factories
- `src/middleware/auth.middleware.ts` — `requireAuth` (verifies JWT via `jwt.verify`, attaches `req.user = {id, roleId, roleName}`), `requireRole(...names)` for later RBAC stories
- `src/dto/auth.dto.ts` — `LoginRequestSchema` ({email, password}), `LoginResponseSchema` ({token, user: {id, name, email, role}})
- `src/repositories/user.repository.ts` — `findByEmail(email): Promise<AppUser | null>` (with `relations: ['role']`)
- `src/services/auth.service.ts` — `login(email, password)`: fetch user, 401 if not found/inactive/password mismatch (constant-shaped error, no user-enumeration hint), sign JWT with `{sub: user.id, role: role.name}`, `expiresIn: env.JWT_EXPIRES_IN`
- `src/controllers/auth.controller.ts` — `POST /v1/auth/login` handler
- `src/routes/auth.routes.ts` — mounts the route (no `requireAuth` — this is the one public endpoint)
- `migrations/…-SeedBootstrapAdmin.ts` — seeds one bootstrap Admin (`admin@ccrm.local`) so the system isn't a chicken-and-egg problem before CA-122 (user creation) exists; bcrypt hash of a documented dev-only password, called out in README with a "rotate before real use" note. `down()` deletes it.

**Package additions:** `bcryptjs`, `@types/bcryptjs`.

## Behavior (maps to CA-138 AC)

- Correct email/password + active user → 200, JWT in response body
- Wrong password, unknown email, or inactive user → 401, identical error message/shape for all three (no enumeration signal), no token
- `requireAuth` middleware (used by every future protected route) verifies signature via `jwt.verify` (never `jwt.decode`), rejects expired/malformed tokens with 401, and populates `req.user` for downstream RBAC — this is what CA-43/CA-66's later visibility rules will consume

## Verification this pass

Per your direction: `npx tsc --noEmit` + `npx eslint` only, plus one manual `curl` smoke test
against the bootstrap admin. Full Jest suite (controller/service/repo/DTO tests) deferred
to the later testing pass, tracked in `plans/PLAN-CA138-Login-JWT/tasks/05-unittest.md`
(left `Pending`).

## Out of scope here

`requireRole` is defined but unused until CA-43/CA-66; no route besides `/v1/auth/login`
is protected yet since no other route exists.

---
Reply to adjust, or say go and I'll implement.
