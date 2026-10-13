import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { User } from '../../users/entities/user.entity';

/**
 * "Kunni yopish" — one row per closing. Every PENDING (cash) transaction up to `closedAt`
 * is settled and re-booked as CARD; the closing keeps the totals for the audit trail.
 */
@Check('chk_day_closings_counts', `"transactions_count" >= 0 AND "payments_count" >= 0`)
@Entity('day_closings')
@Index('idx_day_closings_date', ['closingDate'])
export class DayClosing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Business day (clinic time zone) the closing belongs to. */
  @Column({ type: 'date' })
  closingDate: string;

  /** Net cash (payments − refunds) that was settled. */
  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer, default: 0 })
  amount: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer, default: 0 })
  refundedAmount: number;

  @Column({ type: 'int', default: 0 })
  transactionsCount: number;

  @Column({ type: 'int', default: 0 })
  paymentsCount: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'uuid', nullable: true })
  closedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'closed_by_id' })
  closedBy?: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  closedAt: Date;
}
