import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MedicalService } from '../../services/entities/service.entity';
import { PaymentItem } from '../../payments/entities/payment-item.entity';
import { QueueTicket } from './queue-ticket.entity';

@Entity('queue_ticket_services')
@Index('idx_queue_ticket_services_ticket', ['ticketId'])
export class QueueTicketService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ticketId: string;

  @ManyToOne(() => QueueTicket, (ticket) => ticket.ticketServices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket?: QueueTicket;

  @Column('uuid')
  serviceId: string;

  @ManyToOne(() => MedicalService, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service?: MedicalService;

  @Column({ type: 'uuid', nullable: true })
  paymentItemId: string | null;

  @ManyToOne(() => PaymentItem, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'payment_item_id' })
  paymentItem?: PaymentItem | null;

  @Column({ length: 200 })
  serviceName: string;
}
