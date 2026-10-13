import { MigrationInterface, QueryRunner } from 'typeorm';

/** Hisobchi / Rahbar rollari va super admin belgilaydigan bo'limlarga ruxsat. */
export class UserSections1790900000003 implements MigrationInterface {
  name = 'UserSections1790900000003';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'ACCOUNTANT'`);
    await q.query(`ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'MANAGER'`);
    await q.query(`ALTER TABLE "users" ADD "allowed_sections" text array`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" DROP COLUMN "allowed_sections"`);
    // enum values cannot be dropped in PostgreSQL; ACCOUNTANT / MANAGER stay in user_role
  }
}
