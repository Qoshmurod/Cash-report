import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VisitStatus } from '../../../common/constants/enums';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { QueueTicket } from '../../queues/entities/queue-ticket.entity';

@Entity('visits')
@Index('idx_visits_patient', ['patientId'])
@Index('idx_visits_doctor_started', ['doctorId', 'startedAt'])
export class Visit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  queueTicketId: string;

  @OneToOne(() => QueueTicket, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'queue_ticket_id' })
  queueTicket?: QueueTicket;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column('uuid')
  doctorId: string;

  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: Doctor;

  @Column({ type: 'enum', enum: VisitStatus, enumName: 'visit_status', default: VisitStatus.IN_PROGRESS })
  status: VisitStatus;

  @Column({ type: 'timestamptz' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  complaint: string | null;

  @Column({ type: 'text', nullable: true })
  diagnosis: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
