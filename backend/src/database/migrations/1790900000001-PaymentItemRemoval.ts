import { MigrationInterface, QueryRunner } from 'typeorm';

/** Xizmatni to'lovdan olib tashlash: removed items stay for history but are excluded from totals/reports. */
export class PaymentItemRemoval1790900000001 implements MigrationInterface {
  name = 'PaymentItemRemoval1790900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payment_items" ADD "removed_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "payment_items" ADD "removed_reason" character varying(500)`);
    await queryRunner.query(`ALTER TABLE "payment_items" ADD "removed_by_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "payment_items" ADD CONSTRAINT "FK_payment_items_removed_by" FOREIGN KEY ("removed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payment_items" DROP CONSTRAINT "FK_payment_items_removed_by"`);
    await queryRunner.query(`ALTER TABLE "payment_items" DROP COLUMN "removed_by_id"`);
    await queryRunner.query(`ALTER TABLE "payment_items" DROP COLUMN "removed_reason"`);
    await queryRunner.query(`ALTER TABLE "payment_items" DROP COLUMN "removed_at"`);
  }
}
