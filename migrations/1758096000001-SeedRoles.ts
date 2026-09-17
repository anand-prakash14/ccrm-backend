// 2. Third-party
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the `role` table with exactly the two launch roles (CA-137 AC,
 * CA-42). Roles are data, not a hardcoded enum — new roles can be inserted
 * later without a migration.
 */
export class SeedRoles1758096000001 implements MigrationInterface {
  name = 'SeedRoles1758096000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "role" ("name") VALUES ('SalesMan'), ('Admin')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role" WHERE "name" IN ('SalesMan', 'Admin')
    `);
  }
}
