// Ensures the Zod-validated env schema (src/config/env.ts) has values to
// parse when test files import modules that transitively load it, without
// requiring a real .env file in CI.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://ccrm:ccrm@localhost:5432/ccrm';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-only-secret-please-override-in-real-envs-0123456789';
process.env.TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://ccrm:ccrm@localhost:5432/ccrm_test';
