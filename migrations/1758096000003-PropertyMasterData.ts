// 2. Third-party
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CA-151/CA-152/CA-153: Property master data (bhk_type + property) and the
 * site_visit_property join table, replacing site_visit's free-text
 * property_project/units columns.
 */
export class PropertyMasterData1758096000003 implements MigrationInterface {
  name = 'PropertyMasterData1758096000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "bhk_type" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_bhk_type_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "bhk_type" ("name") VALUES ('1BHK'), ('2BHK'), ('3BHK'), ('4BHK'), ('Studio')
    `);

    await queryRunner.query(`CREATE TYPE "property_status_enum" AS ENUM (
      'Available', 'Sold', 'Blocked', 'On-hold'
    )`);
    await queryRunner.query(`
      CREATE TABLE "property" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "project_name" varchar(255) NOT NULL,
        "city" varchar(100) NOT NULL,
        "locality" varchar(255) NOT NULL,
        "bhk_type_id" uuid NOT NULL,
        "area_sqft" decimal(10,2),
        "price" decimal(19,4) NOT NULL,
        "status" property_status_enum NOT NULL DEFAULT 'Available',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_property_bhk_type" FOREIGN KEY ("bhk_type_id") REFERENCES "bhk_type"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_property_city" ON "property" ("city")`);
    await queryRunner.query(`CREATE INDEX "idx_property_locality" ON "property" ("locality")`);
    await queryRunner.query(
      `CREATE INDEX "idx_property_bhk_type_id" ON "property" ("bhk_type_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_property_status" ON "property" ("status")`);

    await queryRunner.query(`CREATE TYPE "site_visit_property_status_enum" AS ENUM (
      'Scheduled', 'Seen', 'Shortlisted', 'Rejected', 'Booked'
    )`);
    await queryRunner.query(`
      CREATE TABLE "site_visit_property" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "site_visit_id" uuid NOT NULL,
        "property_id" uuid NOT NULL,
        "status" site_visit_property_status_enum NOT NULL DEFAULT 'Scheduled',
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_site_visit_property" UNIQUE ("site_visit_id", "property_id"),
        CONSTRAINT "fk_site_visit_property_site_visit" FOREIGN KEY ("site_visit_id") REFERENCES "site_visit"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_site_visit_property_property" FOREIGN KEY ("property_id") REFERENCES "property"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_site_visit_property_site_visit_id" ON "site_visit_property" ("site_visit_id")`,
    );

    // Superseded by site_visit_property — one visit now attaches N real
    // Property records instead of a single free-text project/unit pair.
    await queryRunner.query(`ALTER TABLE "site_visit" DROP COLUMN "property_project"`);
    await queryRunner.query(`ALTER TABLE "site_visit" DROP COLUMN "units"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "site_visit" ADD COLUMN "units" varchar(255)`);
    await queryRunner.query(
      `ALTER TABLE "site_visit" ADD COLUMN "property_project" varchar(255) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_visit" ALTER COLUMN "property_project" DROP DEFAULT`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "site_visit_property"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "site_visit_property_status_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "property"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "property_status_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "bhk_type"`);
  }
}
