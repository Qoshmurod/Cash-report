import {
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
import { Gender, KioskRequestStatus } from '../../../common/constants/enums';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { User } from '../../users/entities/user.entity';
import { KioskRequestItem } from './kiosk-request-item.entity';
import type { Patient } from '../../patients/entities/patient.entity';

@Entity('kiosk_requests')
@Index('idx_kiosk_requests_status_created', ['status', 'createdAt'])
export class KioskRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('uq_kiosk_requests_number', { unique: true })
  @Column({ type: 'int', default: () => "nextval('kiosk_request_number_seq')" })
  number: number;

  @Column({ type: 'enum', enum: KioskRequestStatus, enumName: 'kiosk_request_status', default: KioskRequestStatus.NEW })
  status: KioskRequestStatus;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  middleName: string | null;

  @Column({ length: 32 })
  phone: string;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'enum', enum: Gender, enumName: 'gender', nullable: true })
  gender: Gender | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer, default: 0 })
  totalAmount: number;

  @Column({ type: 'uuid', nullable: true })
  kioskUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'kiosk_user_id' })
  kioskUser?: User | null;

  @Column({ type: 'uuid', nullable: true })
  claimedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  claimedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  processedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'processed_by_id' })
  processedBy?: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  paymentId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cancelReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => KioskRequestItem, (item) => item.kioskRequest, { cascade: ['insert'] })
  items: KioskRequestItem[];

  matchedPatients?: Patient[];
}
