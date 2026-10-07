import { CreateDateColumn, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Doctor } from './doctor.entity';
import { MedicalService } from '../../services/entities/service.entity';

/** Explicit many-to-many: which doctor provides which service. */
@Entity('doctor_services')
@Index('uq_doctor_services_pair', ['doctorId', 'serviceId'], { unique: true })
@Index('idx_doctor_services_service', ['serviceId'])
export class DoctorService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  doctorId: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.doctorServices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: Doctor;

  @Column('uuid')
  serviceId: string;

  @ManyToOne(() => MedicalService, (service) => service.doctorServices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service?: MedicalService;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
