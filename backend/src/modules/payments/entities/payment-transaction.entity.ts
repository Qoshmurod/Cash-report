import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMethod, PaymentTransactionType } from '../../../common/constants/enums';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { User } from '../../users/entities/user.entity';
import { Payment } from './payment.entity';

/** Every money movement (payment / partial top-up / refund) — the basis of revenue reports. */
@Check('chk_payment_transactions_amount', `"amount" > 0`)
@Entity('payment_transactions')
@Index('idx_payment_transactions_created_method', ['createdAt', 'method'])
@Index('idx_payment_transactions_payment', ['paymentId'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  paymentId: string;

  @ManyToOne(() => Payment, (payment) => payment.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment?: Payment;

  @Column({ type: 'enum', enum: PaymentTransactionType, enumName: 'payment_transaction_type' })
  type: PaymentTransactionType;

  @Column({ type: 'enum', enum: PaymentMethod, enumName: 'payment_method' })
  method: PaymentMethod;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  amount: number;

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
