import { MigrationInterface, QueryRunner } from 'typeorm';

/** Shartnoma: avans o'tkazmalar, bemorlar ro'yxati, qoldiq ogohlantirish chegarasi. */
export class ContractBalance1790900000002 implements MigrationInterface {
  name = 'ContractBalance1790900000002';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "contracts" ADD "start_date" date`);
    await q.query(`ALTER TABLE "contracts" ADD "end_date" date`);
    await q.query(`ALTER TABLE "contracts" ADD "is_active" boolean NOT NULL DEFAULT true`);
    await q.query(`ALTER TABLE "contracts" ADD "warning_threshold_percent" integer NOT NULL DEFAULT 10`);
    await q.query(`ALTER TABLE "contracts" ADD "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    await q.query(`ALTER TABLE "contracts" ADD CONSTRAINT "chk_contracts_threshold" CHECK ("warning_threshold_percent" >= 0 AND "warning_threshold_percent" <= 100)`);

    await q.query(
      `CREATE TABLE "contract_deposits" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "contract_id" uuid NOT NULL, "amount" numeric(14,2) NOT NULL, "deposit_date" date NOT NULL, "document_number" character varying(100), "note" text, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "chk_contract_deposits_amount" CHECK ("amount" <> 0), CONSTRAINT "PK_contract_deposits_id" PRIMARY KEY ("id"))`,
    );
    await q.query(`CREATE INDEX "idx_contract_deposits_contract" ON "contract_deposits" ("contract_id") `);
    await q.query(`ALTER TABLE "contract_deposits" ADD CONSTRAINT "FK_contract_deposits_contract" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "contract_deposits" ADD CONSTRAINT "FK_contract_deposits_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

    await q.query(
      `CREATE TABLE "contract_patients" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "contract_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "note" character varying(255), "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_contract_patients_id" PRIMARY KEY ("id"))`,
    );
    await q.query(`CREATE UNIQUE INDEX "uq_contract_patients_pair" ON "contract_patients" ("contract_id", "patient_id") `);
    await q.query(`CREATE INDEX "idx_contract_patients_patient" ON "contract_patients" ("patient_id") `);
    await q.query(`ALTER TABLE "contract_patients" ADD CONSTRAINT "FK_contract_patients_contract" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "contract_patients" ADD CONSTRAINT "FK_contract_patients_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "contract_patients" ADD CONSTRAINT "FK_contract_patients_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await q.query(`CREATE INDEX IF NOT EXISTS "idx_payments_contract" ON "payments" ("contract_id") `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "public"."idx_payments_contract"`);
    await q.query(`DROP TABLE "contract_patients"`);
    await q.query(`DROP TABLE "contract_deposits"`);
    await q.query(`ALTER TABLE "contracts" DROP CONSTRAINT "chk_contracts_threshold"`);
    await q.query(`ALTER TABLE "contracts" DROP COLUMN "updated_at"`);
    await q.query(`ALTER TABLE "contracts" DROP COLUMN "warning_threshold_percent"`);
    await q.query(`ALTER TABLE "contracts" DROP COLUMN "is_active"`);
    await q.query(`ALTER TABLE "contracts" DROP COLUMN "end_date"`);
    await q.query(`ALTER TABLE "contracts" DROP COLUMN "start_date"`);
  }
}
