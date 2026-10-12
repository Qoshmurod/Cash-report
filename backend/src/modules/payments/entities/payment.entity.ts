import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';
import { PaymentItem } from './payment-item.entity';
import { PaymentTransaction } from './payment-transaction.entity';
import { PaymentStatus, PaymentMethod } from '../domain/payment-status';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod: PaymentMethod;

  @Column({ name: 'is_shift_closed', type: 'boolean', default: false })
  isShiftClosed: boolean;

  @Column({ name: 'shift_closed_at', type: 'timestamp', nullable: true })
  shiftClosedAt: Date;

  @Column({ name: 'confirmed_by_user_id', type: 'uuid', nullable: true })
  confirmedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'confirmed_by_user_id' })
  confirmedByUser: User;

  @OneToMany(() => PaymentItem, (item) => item.payment, { cascade: true })
  items: PaymentItem[];

  @OneToMany(() => PaymentTransaction, (tx) => tx.payment, { cascade: true })
  transactions: PaymentTransaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
