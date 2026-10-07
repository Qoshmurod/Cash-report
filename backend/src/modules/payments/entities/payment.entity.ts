import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod, PaymentStatus } from '../../../common/constants/enums';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';
import { Contract } from './contract.entity';
import { PaymentItem } from './payment-item.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import type { QueueTicket } from '../../queues/entities/queue-ticket.entity';

const money = { type: 'numeric' as const, precision: 14, scale: 2, transformer: numericTransformer, default: 0 };

@Check('chk_payments_amounts', `"total_amount" >= 0 AND "paid_amount" >= 0 AND "remaining_amount" >= 0 AND "refunded_amount" >= 0 AND "refunded_amount" <= "paid_amount"`)
@Entity('payments')
@Index('idx_payments_created_at', ['createdAt'])
@Index('idx_payments_status', ['status'])
@Index('idx_payments_method', ['method'])
@Index('idx_payments_patient', ['patientId'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('uq_payments_receipt_number', { unique: true })
  @Column({ length: 30 })
  receiptNumber: string;

  /** Client generated key → duplicate payment protection. */
  @Index('uq_payments_idempotency_key', { unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  idempotencyKey: string | null;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column(money)
  totalAmount: number;

  @Column(money)
  paidAmount: number;

  @Column(money)
  remainingAmount: number;

  @Column(money)
  refundedAmount: number;

  @Column({ type: 'enum', enum: PaymentMethod, enumName: 'payment_method' })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, enumName: 'payment_status' })
  status: PaymentStatus;

  @Column({ type: 'uuid', nullable: true })
  contractId: string | null;

  @ManyToOne(() => Contract, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract?: Contract | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cancelReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => PaymentItem, (item) => item.payment)
  items: PaymentItem[];

  @OneToMany(() => PaymentTransaction, (tx) => tx.payment)
  transactions?: PaymentTransaction[];

  queueTickets?: QueueTicket[];
}
