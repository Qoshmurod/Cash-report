import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { User } from '../../users/entities/user.entity';
import { MedicalService } from './service.entity';

@Entity('service_price_history')
@Index('idx_service_price_history_service', ['serviceId', 'changedAt'])
export class ServicePriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  serviceId: string;

  @ManyToOne(() => MedicalService, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service?: MedicalService;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  oldPrice: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  newPrice: number;

  @Column({ type: 'uuid', nullable: true })
  changedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy?: User | null;

  @CreateDateColumn({ type: 'timestamptz' })
  changedAt: Date;
}
