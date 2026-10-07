import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { MedicalService } from '../../services/entities/service.entity';
import { KioskRequest } from './kiosk-request.entity';

@Entity('kiosk_request_items')
@Index('idx_kiosk_request_items_request', ['kioskRequestId'])
export class KioskRequestItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  kioskRequestId: string;

  @ManyToOne(() => KioskRequest, (req) => req.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kiosk_request_id' })
  kioskRequest?: KioskRequest;

  @Column('uuid')
  serviceId: string;

  @ManyToOne(() => MedicalService, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service?: MedicalService;

  /** Snapshot at request time (price may change later). */
  @Column({ length: 200 })
  serviceName: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  price: number;
}
