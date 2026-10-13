import { MigrationInterface, QueryRunner } from 'typeorm';

/** Ruxsatlarni belgilash: bo'limlar a delegate may hand out (approved by the super admin). */
export class GrantableSections1790900000005 implements MigrationInterface {
  name = 'GrantableSections1790900000005';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" ADD "grantable_sections" text array`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" DROP COLUMN "grantable_sections"`);
  }
}
