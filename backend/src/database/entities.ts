import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { Department } from '../modules/departments/entities/department.entity';
import { DoctorService } from '../modules/doctors/entities/doctor-service.entity';
import { Doctor } from '../modules/doctors/entities/doctor.entity';
import { KioskRequestItem } from '../modules/kiosk/entities/kiosk-request-item.entity';
import { KioskRequest } from '../modules/kiosk/entities/kiosk-request.entity';
import { LoginHistory } from '../modules/login-history/entities/login-history.entity';
import { Patient } from '../modules/patients/entities/patient.entity';
import { Contract } from '../modules/payments/entities/contract.entity';
import { PaymentItem } from '../modules/payments/entities/payment-item.entity';
import { PaymentTransaction } from '../modules/payments/entities/payment-transaction.entity';
import { Payment } from '../modules/payments/entities/payment.entity';
import { QueueCounter } from '../modules/queues/entities/queue-counter.entity';
import { QueueTicketService } from '../modules/queues/entities/queue-ticket-service.entity';
import { QueueTicket } from '../modules/queues/entities/queue-ticket.entity';
import { ServicePriceHistory } from '../modules/services/entities/service-price-history.entity';
import { MedicalService } from '../modules/services/entities/service.entity';
import { SystemSetting } from '../modules/settings/entities/system-setting.entity';
import { User } from '../modules/users/entities/user.entity';
import { Visit } from '../modules/visits/entities/visit.entity';

export const ENTITIES = [
  User,
  RefreshToken,
  Doctor,
  DoctorService,
  Department,
  MedicalService,
  ServicePriceHistory,
  Patient,
  KioskRequest,
  KioskRequestItem,
  Payment,
  PaymentItem,
  PaymentTransaction,
  Contract,
  QueueCounter,
  QueueTicket,
  QueueTicketService,
  Visit,
  AuditLog,
  LoginHistory,
  SystemSetting,
];
