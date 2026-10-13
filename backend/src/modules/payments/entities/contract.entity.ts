import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import type { ContractDeposit } from '../../contracts/entities/contract-deposit.entity';
import type { ContractPatient } from '../../contracts/entities/contract-patient.entity';

/**
 * Organization/insurance agreement ("SHARTNOMA"). The organization transfers money in advance
 * (deposits); listed patients are served against that balance; a warning is raised when the
 * remaining balance falls to `warningThresholdPercent` % of everything deposited.
 */
@Check('chk_contracts_threshold', `"warning_threshold_percent" >= 0 AND "warning_threshold_percent" <= 100`)
@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('uq_contracts_number', { unique: true })
  @Column({ length: 100 })
  contractNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  organization: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  /** Shartnoma summasi — total agreed amount (deposits may come in parts). */
  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true, transformer: numericTransformer })
  contractAmount: number | null;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** Warn when balance ≤ this % of total deposited. */
  @Column({ type: 'int', default: 10 })
  warningThresholdPercent: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  deposits?: ContractDeposit[];
  patients?: ContractPatient[];
}
