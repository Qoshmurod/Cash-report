import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Contract } from '../../payments/entities/contract.entity';
import { User } from '../../users/entities/user.entity';

/** Money transferred by the organization under a contract (shartnoma bo'yicha o'tkazma). */
@Check('chk_contract_deposits_amount', `"amount" <> 0`)
@Entity('contract_deposits')
@Index('idx_contract_deposits_contract', ['contractId'])
export class ContractDeposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  contractId: string;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract?: Contract;

  /** Positive = transfer received; negative = correction. */
  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  amount: number;

  /** Date the transfer was made (bank document date). */
  @Column({ type: 'date' })
  depositDate: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  documentNumber: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
