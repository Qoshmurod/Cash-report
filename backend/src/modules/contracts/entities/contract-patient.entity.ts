import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Contract } from '../../payments/entities/contract.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';

/** Patients allowed to be served under a contract (shartnoma bo'yicha mijozlar ro'yxati). */
@Entity('contract_patients')
@Index('uq_contract_patients_pair', ['contractId', 'patientId'], { unique: true })
@Index('idx_contract_patients_patient', ['patientId'])
export class ContractPatient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  contractId: string;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract?: Contract;

  @Column('uuid')
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient?: Patient;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy?: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
