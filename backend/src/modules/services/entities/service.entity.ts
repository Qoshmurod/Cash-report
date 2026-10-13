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
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Department } from '../../departments/entities/department.entity';
import { DoctorService } from '../../doctors/entities/doctor-service.entity';
import type { Doctor } from '../../doctors/entities/doctor.entity';

/** A billable medical service (named MedicalService to avoid clashing with the "service" layer concept). */
@Check('chk_services_price', `"price" >= 0`)
@Entity('services')
@Index('idx_services_department_active', ['departmentId', 'isActive'])
export class MedicalService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  departmentId: string;

  @ManyToOne(() => Department, (department) => department.services, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  nameRu: string | null;

  @Index('uq_services_code', { unique: true })
  @Column({ length: 30 })
  code: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  price: number;

  @Column({ type: 'int', default: 15 })
  durationMinutes: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => DoctorService, (ds) => ds.service)
  doctorServices?: DoctorService[];

  doctors?: Doctor[];
}
