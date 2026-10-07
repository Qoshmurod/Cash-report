import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Department } from '../../departments/entities/department.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { MedicalService } from '../../services/entities/service.entity';
import { Payment } from './payment.entity';

@Entity('payment_items')
@Index('idx_payment_items_payment', ['paymentId'])
@Index('idx_payment_items_service', ['serviceId'])
@Index('idx_payment_items_doctor', ['doctorId'])
@Index('idx_payment_items_department', ['departmentId'])
export class PaymentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  paymentId: string;

  @ManyToOne(() => Payment, (payment) => payment.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment?: Payment;

  @Column('uuid')
  serviceId: string;

  @ManyToOne(() => MedicalService, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service?: MedicalService;

  /** Snapshots — history stays correct after renames / price changes. */
  @Column({ length: 200 })
  serviceName: string;

  @Column({ length: 30 })
  serviceCode: string;

  @Column('uuid')
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ type: 'uuid', nullable: true })
  doctorId: string | null;

  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: Doctor | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  price: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: numericTransformer })
  amount: number;
}
