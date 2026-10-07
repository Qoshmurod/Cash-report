import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Gender, Role, UserStatus } from '../../../common/constants/enums';
import { Doctor } from '../../doctors/entities/doctor.entity';

@Entity('users')
@Index('idx_users_role_status', ['role', 'status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('uq_users_login', { unique: true })
  @Column({ length: 64 })
  login: string;

  @Column({ length: 100, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, enumName: 'user_role' })
  role: Role;

  @Column({ type: 'enum', enum: UserStatus, enumName: 'user_status', default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  middleName: string | null;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'enum', enum: Gender, enumName: 'gender', nullable: true })
  gender: Gender | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  profession: string | null;

  /** Base64 data URL — see ImageStorage abstraction for future object storage migration. */
  @Column({ type: 'text', nullable: true })
  avatar: string | null;

  @Column({ default: false })
  mustChangePassword: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordChangedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => Doctor, (doctor) => doctor.user)
  doctor?: Doctor | null;
}
