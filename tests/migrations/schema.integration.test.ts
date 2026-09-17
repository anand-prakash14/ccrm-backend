// 1. Node built-ins
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// 2. Third-party
import { Client } from 'pg';

const TEST_DATABASE_URL: string =
  process.env.TEST_DATABASE_URL ?? 'postgres://ccrm:ccrm@localhost:5432/ccrm_test';
const REPO_ROOT: string = path.resolve(__dirname, '..', '..');
const EXPECTED_TABLES: readonly string[] = [
  'role',
  'app_user',
  'lead',
  'site_visit',
  'conclusion',
  'activity_log',
];
// Each CLI invocation cold-starts ts-node to load the TypeScript migration
// files — comfortably exceeds Jest's 5s default hook/test timeout, especially
// where a single hook or test issues more than one invocation.
const CLI_TIMEOUT_MS = 30_000;

const EXPECTED_INDEXES: readonly string[] = [
  'idx_app_user_role_id',
  'idx_lead_assigned_saleman_id',
  'idx_lead_stage',
  'idx_lead_source',
  'idx_site_visit_lead_id',
  'idx_activity_log_lead_id_created_at',
];

// Invoke the TypeORM CLI's JS entrypoint directly via `node` rather than
// through `npx` — `npx`/`npx.cmd` resolution differs enough across
// platforms (notably Windows) that `execFileSync('npx', ...)` is not
// reliable without a shell; calling the entrypoint with `process.execPath`
// avoids that entirely.
const TYPEORM_CLI_ENTRYPOINT: string = path.join(
  REPO_ROOT,
  'node_modules',
  'typeorm',
  'cli-ts-node-commonjs.js',
);

function runTypeOrmCli(command: 'migration:run' | 'migration:revert'): void {
  execFileSync(
    process.execPath,
    [TYPEORM_CLI_ENTRYPOINT, command, '-d', 'src/config/data-source.ts'],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe',
    },
  );
}

async function connect(): Promise<Client> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  return client;
}

async function tableExists(client: Client, tableName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS "exists"`,
    [tableName],
  );
  return result.rows[0].exists;
}

async function indexExists(client: Client, indexName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1
     ) AS "exists"`,
    [indexName],
  );
  return result.rows[0].exists;
}

describe('CA-137 — CRM database schema and migrations', () => {
  beforeAll(() => {
    runTypeOrmCli('migration:run');
  }, CLI_TIMEOUT_MS);

  afterAll(() => {
    // Two migrations were applied (InitSchema, SeedRoles) — revert both so
    // the test database is left clean, and to exercise/prove down() works.
    runTypeOrmCli('migration:revert');
    runTypeOrmCli('migration:revert');
  }, CLI_TIMEOUT_MS);

  it('creates all 6 HLD tables', async () => {
    const client = await connect();
    try {
      for (const table of EXPECTED_TABLES) {
        await expect(tableExists(client, table)).resolves.toBe(true);
      }
    } finally {
      await client.end();
    }
  });

  it('creates all 6 HLD-specified indexes', async () => {
    const client = await connect();
    try {
      for (const index of EXPECTED_INDEXES) {
        await expect(indexExists(client, index)).resolves.toBe(true);
      }
    } finally {
      await client.end();
    }
  });

  it('seeds the role table with exactly SalesMan and Admin', async () => {
    const client = await connect();
    try {
      const result = await client.query<{ name: string }>(
        'SELECT "name" FROM "role" ORDER BY "name"',
      );
      expect(result.rows.map((row) => row.name)).toEqual(['Admin', 'SalesMan']);
    } finally {
      await client.end();
    }
  });

  it(
    'reverts cleanly: down-migrations remove both seeded roles and all tables',
    async () => {
      // Revert SeedRoles first (reverse order of application).
      runTypeOrmCli('migration:revert');

      const clientAfterFirstRevert = await connect();
      try {
        const result = await clientAfterFirstRevert.query('SELECT * FROM "role"');
        expect(result.rows).toHaveLength(0);
        await expect(tableExists(clientAfterFirstRevert, 'lead')).resolves.toBe(true);
      } finally {
        await clientAfterFirstRevert.end();
      }

      // Revert InitSchema — drops every table.
      runTypeOrmCli('migration:revert');

      const clientAfterSecondRevert = await connect();
      try {
        for (const table of EXPECTED_TABLES) {
          await expect(tableExists(clientAfterSecondRevert, table)).resolves.toBe(false);
        }
      } finally {
        await clientAfterSecondRevert.end();
      }

      // Re-apply so afterAll's revert calls have a known (empty-DB) starting
      // point and don't error on an already-reverted database.
      runTypeOrmCli('migration:run');
    },
    CLI_TIMEOUT_MS,
  );
});
