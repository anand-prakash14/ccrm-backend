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
  'bhk_type',
  'property',
  'site_visit_property',
];
// Each CLI invocation cold-starts ts-node to load the TypeScript migration
// files — comfortably exceeds Jest's 5s default hook/test timeout, especially
// where a single hook or test issues more than one invocation.
const CLI_TIMEOUT_MS = 30_000;

// Keep in sync with the number of files under migrations/ — this suite
// reverts every applied migration to prove each down() works, so it must
// know exactly how many there are.
const MIGRATION_COUNT = 4;

const EXPECTED_INDEXES: readonly string[] = [
  'idx_app_user_role_id',
  'idx_lead_assigned_saleman_id',
  'idx_lead_stage',
  'idx_lead_source',
  'idx_site_visit_lead_id',
  'idx_activity_log_lead_id_created_at',
  'idx_property_city',
  'idx_property_locality',
  'idx_property_bhk_type_id',
  'idx_property_status',
  'idx_site_visit_property_site_visit_id',
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

describe('CA-137/CA-151 — CRM + Property master data schema and migrations', () => {
  beforeAll(() => {
    runTypeOrmCli('migration:run');
  }, CLI_TIMEOUT_MS);

  afterAll(() => {
    // Revert every applied migration so the test database is left clean.
    for (let i = 0; i < MIGRATION_COUNT; i += 1) {
      runTypeOrmCli('migration:revert');
    }
  }, CLI_TIMEOUT_MS);

  it('creates all 9 tables (6 CRM + 3 Property master data)', async () => {
    const client = await connect();
    try {
      for (const table of EXPECTED_TABLES) {
        await expect(tableExists(client, table)).resolves.toBe(true);
      }
    } finally {
      await client.end();
    }
  });

  it('creates all specified indexes', async () => {
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

  it('seeds the bhk_type table with exactly the 5 specified types', async () => {
    const client = await connect();
    try {
      const result = await client.query<{ name: string }>(
        'SELECT "name" FROM "bhk_type" ORDER BY "name"',
      );
      expect(result.rows.map((row) => row.name)).toEqual([
        '1BHK',
        '2BHK',
        '3BHK',
        '4BHK',
        'Studio',
      ]);
    } finally {
      await client.end();
    }
  });

  it(
    'reverts cleanly: down-migrations undo property master data, the bootstrap admin, seeded roles, then all tables',
    async () => {
      // Revert PropertyMasterData first (reverse order of application) —
      // drops bhk_type/property/site_visit_property and restores
      // site_visit.property_project/units; the 6 original tables/seed data
      // are untouched.
      runTypeOrmCli('migration:revert');

      const clientAfterFirstRevert = await connect();
      try {
        await expect(tableExists(clientAfterFirstRevert, 'bhk_type')).resolves.toBe(false);
        await expect(tableExists(clientAfterFirstRevert, 'property')).resolves.toBe(false);
        await expect(tableExists(clientAfterFirstRevert, 'site_visit_property')).resolves.toBe(
          false,
        );
        await expect(tableExists(clientAfterFirstRevert, 'site_visit')).resolves.toBe(true);
        const result = await clientAfterFirstRevert.query<{ name: string }>(
          'SELECT "name" FROM "role" ORDER BY "name"',
        );
        expect(result.rows.map((row) => row.name)).toEqual(['Admin', 'SalesMan']);
      } finally {
        await clientAfterFirstRevert.end();
      }

      // Revert SeedBootstrapAdmin — roles untouched, only the bootstrap
      // app_user row is removed.
      runTypeOrmCli('migration:revert');

      const clientAfterSecondRevert = await connect();
      try {
        const adminUser = await clientAfterSecondRevert.query(
          'SELECT * FROM "app_user" WHERE "email" = $1',
          ['admin@ccrm.local'],
        );
        expect(adminUser.rows).toHaveLength(0);
      } finally {
        await clientAfterSecondRevert.end();
      }

      // Revert SeedRoles — role table now empty, tables still exist.
      runTypeOrmCli('migration:revert');

      const clientAfterThirdRevert = await connect();
      try {
        const result = await clientAfterThirdRevert.query('SELECT * FROM "role"');
        expect(result.rows).toHaveLength(0);
        await expect(tableExists(clientAfterThirdRevert, 'lead')).resolves.toBe(true);
      } finally {
        await clientAfterThirdRevert.end();
      }

      // Revert InitSchema — drops the 6 original tables.
      runTypeOrmCli('migration:revert');

      const clientAfterFourthRevert = await connect();
      try {
        for (const table of [
          'role',
          'app_user',
          'lead',
          'site_visit',
          'conclusion',
          'activity_log',
        ]) {
          await expect(tableExists(clientAfterFourthRevert, table)).resolves.toBe(false);
        }
      } finally {
        await clientAfterFourthRevert.end();
      }

      // Re-apply so afterAll's revert calls have a known (empty-DB) starting
      // point and don't error on an already-reverted database.
      runTypeOrmCli('migration:run');
    },
    CLI_TIMEOUT_MS,
  );
});
