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
import { QueueStatus } from '../../../common/constants/enums';
import { Department } from '../../departments/entities/department.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { QueueTicketService } from './queue-ticket-service.entity';

@Entity('queue_tickets')
@Index('uq_queue_tickets_date_number', ['queueDate', 'ticketNumber'], { unique: true })
@Index('idx_queue_tickets_doctor_date_status', ['doctorId', 'queueDate', 'status'])
@Index('idx_queue_tickets_date_status', ['queueDate', 'status'])
@Index('idx_queue_tickets_patient', ['patientId'])
@Index('idx_queue_tickets_payment', ['paymentId'])
export class QueueTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 12 })
  ticketNumber: string;

  @Column({ length: 3 })
  prefix: string;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'date' })
  queueDate: string;

  @Column({ type: 'enum', enum: QueueStatus, enumName: 'queue_status', default: QueueStatus.WAITING })
  status: QueueStatus;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column({ type: 'uuid', nullable: true })
  doctorId: string | null;

  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: Doctor | null;

  @Column('uuid')
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ type: 'uuid', nullable: true })
  paymentId: string | null;

  @ManyToOne(() => Payment, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment?: Payment | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  roomNumber: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  calledAt: Date | null;

  @Column({ type: 'int', default: 0 })
  calledCount: number;

  @Column({ type: 'uuid', nullable: true })
  calledById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cancelReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => QueueTicketService, (qts) => qts.ticket)
  ticketServices?: QueueTicketService[];

  /** API shape: `{ id, name }[]` (flattened from ticketServices). */
  services?: { id: string; name: string }[];
}
