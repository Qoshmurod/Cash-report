import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Kunni yopish (day closing):
 *  - settlement_status on payments / payment_transactions (cash stays PENDING until the day is closed)
 *  - original_method keeps the method as received (audit) after closing re-books it as CARD
 *  - day_closings table with the totals of each closing
 * Existing rows are SETTLED — history is not re-booked.
 */
export class DayClosing1790900000000 implements MigrationInterface {
  name = 'DayClosing1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."settlement_status" AS ENUM('PENDING', 'SETTLED')`);
    await queryRunner.query(
      `CREATE TABLE "day_closings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "closing_date" date NOT NULL, "amount" numeric(14,2) NOT NULL DEFAULT '0', "refunded_amount" numeric(14,2) NOT NULL DEFAULT '0', "transactions_count" integer NOT NULL DEFAULT '0', "payments_count" integer NOT NULL DEFAULT '0', "note" text, "closed_by_id" uuid, "closed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "chk_day_closings_counts" CHECK ("transactions_count" >= 0 AND "payments_count" >= 0), CONSTRAINT "PK_day_closings_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "idx_day_closings_date" ON "day_closings" ("closing_date") `);
    await queryRunner.query(
      `ALTER TABLE "day_closings" ADD CONSTRAINT "FK_day_closings_closed_by" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`ALTER TABLE "payments" ADD "settlement_status" "public"."settlement_status" NOT NULL DEFAULT 'SETTLED'`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "original_method" "public"."payment_method"`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "settled_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "payments" ADD "day_closing_id" uuid`);
    await queryRunner.query(`CREATE INDEX "idx_payments_settlement_status" ON "payments" ("settlement_status") `);
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_day_closing" FOREIGN KEY ("day_closing_id") REFERENCES "day_closings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`ALTER TABLE "payment_transactions" ADD "settlement_status" "public"."settlement_status" NOT NULL DEFAULT 'SETTLED'`);
    await queryRunner.query(`ALTER TABLE "payment_transactions" ADD "original_method" "public"."payment_method"`);
    await queryRunner.query(`ALTER TABLE "payment_transactions" ADD "day_closing_id" uuid`);
    await queryRunner.query(`CREATE INDEX "idx_payment_transactions_settlement" ON "payment_transactions" ("settlement_status") `);
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_payment_transactions_day_closing" FOREIGN KEY ("day_closing_id") REFERENCES "day_closings"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payment_transactions" DROP CONSTRAINT "FK_payment_transactions_day_closing"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payment_transactions_settlement"`);
    await queryRunner.query(`ALTER TABLE "payment_transactions" DROP COLUMN "day_closing_id"`);
    await queryRunner.query(`ALTER TABLE "payment_transactions" DROP COLUMN "original_method"`);
    await queryRunner.query(`ALTER TABLE "payment_transactions" DROP COLUMN "settlement_status"`);

    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_day_closing"`);
    await queryRunner.query(`DROP INDEX "public"."idx_payments_settlement_status"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "day_closing_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "settled_at"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "original_method"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "settlement_status"`);

    await queryRunner.query(`ALTER TABLE "day_closings" DROP CONSTRAINT "FK_day_closings_closed_by"`);
    await queryRunner.query(`DROP INDEX "public"."idx_day_closings_date"`);
    await queryRunner.query(`DROP TABLE "day_closings"`);
    await queryRunner.query(`DROP TYPE "public"."settlement_status"`);
  }
}
