import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Contract } from '../../payments/entities/contract.entity';
import { User } from '../../users/entities/user.entity';
import { GuaranteeTemplate } from './guarantee-template.entity';

export enum GuaranteeStatus {
  /** Did not match the template — waits for an authorized approver */
  PENDING = 'PENDING',
  /** Matched the template or approved — credit is open */
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  /** Credit closed by an authorized user */
  REVOKED = 'REVOKED',
}

/** Kafolat xati: lets the contract be served on credit (qarzga) up to `amount` beyond the money transferred. */
@Check('chk_contract_guarantees_amount', `"amount" > 0`)
@Entity('contract_guarantees')
@Index('idx_contract_guarantees_contract', ['contractId'])
export class ContractGuarantee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  contractId: string;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract?: Contract;

  @Column({ type: 'uuid', nullable: true })
  templateId: string | null;

  @ManyToOne(() => GuaranteeTemplate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: GuaranteeTemplate | null;

  @Column({ length: 100 })
  letterNumber: string;

  @Column({ type: 'date' })
  letterDate: string;

  /** Credit limit granted by this letter. */
  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column({ type: 'date', nullable: true })
  validUntil: string | null;

  /** Text of the letter as entered. */
  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'boolean', default: false })
  templateMatched: boolean;

  /** 0–100 word similarity to the filled template. */
  @Column({ type: 'int', default: 0 })
  similarity: number;

  /** Template lines missing from the letter. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  missingLines: string[];

  @Column({ type: 'enum', enum: GuaranteeStatus, enumName: 'guarantee_status' })
  status: GuaranteeStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  decisionNote: string | null;

  @Column({ type: 'uuid', nullable: true })
  decidedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'decided_by_id' })
  decidedBy?: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
