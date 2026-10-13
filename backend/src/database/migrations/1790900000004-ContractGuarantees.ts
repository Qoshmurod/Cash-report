import { MigrationInterface, QueryRunner } from 'typeorm';

/** Shartnoma summasi, kafolat xati namunalari va kafolat xatlari (qarzga o'tkazish). */
export class ContractGuarantees1790900000004 implements MigrationInterface {
  name = 'ContractGuarantees1790900000004';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "contracts" ADD "contract_amount" numeric(14,2)`);
    await q.query(
      `CREATE TABLE "guarantee_templates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" character varying(200) NOT NULL, "body" text NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_guarantee_templates_id" PRIMARY KEY ("id"))`,
    );
    await q.query(`ALTER TABLE "guarantee_templates" ADD CONSTRAINT "FK_guarantee_templates_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await q.query(`CREATE TYPE "public"."guarantee_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')`);
    await q.query(
      `CREATE TABLE "contract_guarantees" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "contract_id" uuid NOT NULL, "template_id" uuid, "letter_number" character varying(100) NOT NULL, "letter_date" date NOT NULL, "amount" numeric(14,2) NOT NULL, "valid_until" date, "body" text NOT NULL, "template_matched" boolean NOT NULL DEFAULT false, "similarity" integer NOT NULL DEFAULT 0, "missing_lines" jsonb NOT NULL DEFAULT '[]'::jsonb, "status" "public"."guarantee_status" NOT NULL, "decision_note" character varying(500), "decided_by_id" uuid, "decided_at" TIMESTAMP WITH TIME ZONE, "created_by_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "chk_contract_guarantees_amount" CHECK ("amount" > 0), CONSTRAINT "PK_contract_guarantees_id" PRIMARY KEY ("id"))`,
    );
    await q.query(`CREATE INDEX "idx_contract_guarantees_contract" ON "contract_guarantees" ("contract_id") `);
    await q.query(`ALTER TABLE "contract_guarantees" ADD CONSTRAINT "FK_contract_guarantees_contract" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "contract_guarantees" ADD CONSTRAINT "FK_contract_guarantees_template" FOREIGN KEY ("template_id") REFERENCES "guarantee_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "contract_guarantees" ADD CONSTRAINT "FK_contract_guarantees_decided_by" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await q.query(`ALTER TABLE "contract_guarantees" ADD CONSTRAINT "FK_contract_guarantees_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "contract_guarantees"`);
    await q.query(`DROP TYPE "public"."guarantee_status"`);
    await q.query(`DROP TABLE "guarantee_templates"`);
    await q.query(`ALTER TABLE "contracts" DROP COLUMN "contract_amount"`);
  }
}
