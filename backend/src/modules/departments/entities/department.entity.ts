import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MedicalService } from '../../services/entities/service.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nameRu: string | null;

  @Index('uq_departments_code', { unique: true })
  @Column({ length: 20 })
  code: string;

  @Index('uq_departments_queue_prefix', { unique: true })
  @Column({ length: 3 })
  queuePrefix: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => MedicalService, (service) => service.department)
  services?: MedicalService[];

  servicesCount?: number;
}
