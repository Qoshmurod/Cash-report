import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DoctorService } from './doctor-service.entity';
import type { MedicalService } from '../../services/entities/service.entity';

export type WeekdayKey = '1' | '2' | '3' | '4' | '5' | '6' | '7';
export interface WorkingInterval {
  start: string;
  end: string;
}
export type WorkSchedule = Partial<Record<WeekdayKey, WorkingInterval | null>>;

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.doctor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ length: 150 })
  specialty: string;

  @Column({ length: 20 })
  roomNumber: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  workSchedule: WorkSchedule;

  @Column({ default: true })
  isAvailable: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => DoctorService, (ds) => ds.doctor)
  doctorServices?: DoctorService[];

  /** Flattened for API responses (not a DB column). */
  services?: MedicalService[];
}
