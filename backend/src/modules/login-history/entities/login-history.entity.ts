import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('login_history')
@Index('idx_login_history_user_login_at', ['userId', 'loginAt'])
@Index('idx_login_history_login_at', ['loginAt'])
export class LoginHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ length: 100 })
  loginAttempt: string;

  @Column()
  success: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  failureReason: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  os: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  device: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  loginAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  logoutAt: Date | null;
}
