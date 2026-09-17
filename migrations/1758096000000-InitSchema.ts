// 2. Third-party
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates all 6 CCRM tables (role, app_user, lead, site_visit, conclusion,
 * activity_log) with the fields, types, foreign keys, and indexes specified
 * in HLD-ccrm-v1.0 § Technical Architecture / Datamodel-ERD.
 *
 * Raw DDL (queryRunner.query) is used here rather than the Table/Index
 * builder API — this is schema definition, not an application query path,
 * so the "no raw SQL string concatenation" rule (which targets
 * user-input-driven repository queries) does not apply; DDL has no
 * parameters to inject.
 */
export class InitSchema1758096000000 implements MigrationInterface {
  name = 'InitSchema1758096000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext"`);

    await queryRunner.query(`
      CREATE TABLE "role" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(50) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_role_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "app_user" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "email" citext NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role_id" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_app_user_email" UNIQUE ("email"),
        CONSTRAINT "fk_app_user_role" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_app_user_role_id" ON "app_user" ("role_id")`);

    await queryRunner.query(`CREATE TYPE "lead_source_enum" AS ENUM (
      'Walk-in', 'Website', 'Property Portal', 'Referral', 'Cold Call', 'Social'
    )`);
    await queryRunner.query(`CREATE TYPE "lead_stage_enum" AS ENUM (
      'Enquiry', 'Lead', 'Opportunity', 'Site Visit', 'Conclusion'
    )`);
    await queryRunner.query(`
      CREATE TABLE "lead" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "alternate_phone" varchar(20),
        "email" citext,
        "source" lead_source_enum NOT NULL,
        "stage" lead_stage_enum NOT NULL DEFAULT 'Enquiry',
        "property_type" varchar(50),
        "preferred_locations" varchar(255),
        "lead_temperature" varchar(20),
        "assigned_saleman_id" uuid,
        "budget_min" decimal(19,4),
        "budget_max" decimal(19,4),
        "purpose" varchar(100),
        "financing_status" varchar(50),
        "purchase_timeline" varchar(50),
        "requirement_notes" text,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_lead_assigned_saleman" FOREIGN KEY ("assigned_saleman_id") REFERENCES "app_user"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_lead_created_by" FOREIGN KEY ("created_by") REFERENCES "app_user"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_lead_assigned_saleman_id" ON "lead" ("assigned_saleman_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_lead_stage" ON "lead" ("stage")`);
    await queryRunner.query(`CREATE INDEX "idx_lead_source" ON "lead" ("source")`);

    await queryRunner.query(`CREATE TYPE "site_visit_status_enum" AS ENUM (
      'Scheduled', 'Completed', 'No-show', 'Rescheduled'
    )`);
    await queryRunner.query(`
      CREATE TABLE "site_visit" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "lead_id" uuid NOT NULL,
        "scheduled_at" timestamptz NOT NULL,
        "property_project" varchar(255) NOT NULL,
        "units" varchar(255),
        "accompanying_saleman_id" uuid,
        "status" site_visit_status_enum NOT NULL DEFAULT 'Scheduled',
        "visit_feedback" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_site_visit_lead" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_site_visit_accompanying_saleman" FOREIGN KEY ("accompanying_saleman_id") REFERENCES "app_user"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_site_visit_lead_id" ON "site_visit" ("lead_id")`);

    await queryRunner.query(
      `CREATE TYPE "conclusion_outcome_enum" AS ENUM ('Won', 'Lost', 'On-hold')`,
    );
    await queryRunner.query(`CREATE TYPE "lost_reason_enum" AS ENUM (
      'Budget', 'Location', 'Financing', 'Chose Competitor', 'Not Interested', 'Timing'
    )`);
    await queryRunner.query(`
      CREATE TABLE "conclusion" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "lead_id" uuid NOT NULL,
        "outcome" conclusion_outcome_enum NOT NULL,
        "unit_booked" varchar(255),
        "booking_token_amount" decimal(19,4),
        "sale_price" decimal(19,4),
        "booking_date" date,
        "lost_reason" lost_reason_enum,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_conclusion_lead_id" UNIQUE ("lead_id"),
        CONSTRAINT "fk_conclusion_lead" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE TYPE "activity_log_entry_type_enum" AS ENUM (
      'note', 'call_log', 'stage_change', 'site_visit_feedback'
    )`);
    await queryRunner.query(`
      CREATE TABLE "activity_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "lead_id" uuid NOT NULL,
        "entry_type" activity_log_entry_type_enum NOT NULL,
        "content" text NOT NULL,
        "actor_user_id" uuid NOT NULL,
        "is_agent_initiated" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_activity_log_lead" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_activity_log_actor_user" FOREIGN KEY ("actor_user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_activity_log_lead_id_created_at" ON "activity_log" ("lead_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_log"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "activity_log_entry_type_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "conclusion"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lost_reason_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "conclusion_outcome_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "site_visit"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "site_visit_status_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "lead"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lead_stage_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "lead_source_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "app_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role"`);
    // pgcrypto/citext extensions are left installed — shared, safe to keep.
  }
}
