// 2. Third-party
import { MigrationInterface, QueryRunner } from 'typeorm';

const BOOTSTRAP_ADMIN_EMAIL = 'admin@ccrm.local';
// bcrypt hash of the dev-only password documented in README ("Bootstrap Admin").
// Rotate immediately in any non-local environment once CA-123 (deactivate)
// or a future change-password story exists.
const BOOTSTRAP_ADMIN_PASSWORD_HASH =
  '$2b$10$ZxFLuHA6w.2zdRh5fhn56OLR9ZhdL6gksrilU9yJTo4jf0nZVHImq';

/**
 * Seeds exactly one Admin account so the system has a way to log in before
 * CA-122 (Admin creates a user) exists — otherwise CA-138's login endpoint
 * has no user to authenticate as, and CA-122 itself requires an
 * authenticated Admin to call it. Not part of CA-138's stated acceptance
 * criteria; added as a pragmatic bootstrap. See README "Bootstrap Admin".
 */
export class SeedBootstrapAdmin1758096000002 implements MigrationInterface {
  name = 'SeedBootstrapAdmin1758096000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO "app_user" ("name", "email", "password_hash", "role_id", "is_active")
      SELECT 'Bootstrap Admin', $1, $2, "id", true
      FROM "role"
      WHERE "name" = 'Admin'
      `,
      [BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD_HASH],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "app_user" WHERE "email" = $1`, [BOOTSTRAP_ADMIN_EMAIL]);
  }
}
