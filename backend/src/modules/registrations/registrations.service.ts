import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { SEQUENCES } from '../../common/constants/app.constants';
import { AuditAction, KioskRequestStatus, PaymentMethod, PaymentTransactionType, QueueStatus, UserStatus } from '../../common/constants/enums';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { roundMoney, sumMoney } from '../../common/utils/money.util';
import { isUniqueViolation } from '../../common/utils/pg-error.util';
import { dateInTz } from '../../common/utils/time.util';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService } from '../audit/audit.service';
import { DoctorService } from '../doctors/entities/doctor-service.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { KioskRequest } from '../kiosk/entities/kiosk-request.entity';
import { Patient } from '../patients/entities/patient.entity';
import { PatientsService } from '../patients/patients.service';
import { computePaymentState } from '../payments/domain/payment-status';
import { Contract } from '../payments/entities/contract.entity';
import { PaymentItem } from '../payments/entities/payment-item.entity';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentsService } from '../payments/payments.service';
import { Receipt } from '../payments/receipt.types';
import { QueueTicketService } from '../queues/entities/queue-ticket-service.entity';
import { QueueTicket } from '../queues/entities/queue-ticket.entity';
import { QueueNumberService } from '../queues/queue-number.service';
import { QueuesService } from '../queues/queues.service';
import { RealtimeService } from '../realtime/realtime.service';
import { MedicalService } from '../services/entities/service.entity';
import { SettingsService } from '../settings/settings.service';
import { CheckoutDto } from './dto/checkout.dto';

export interface CheckoutResult {
  patient: Patient;
  payment: Payment;
  tickets: QueueTicket[];
  receipt: Receipt;
}

const IDEMPOTENCY_CONSTRAINT = 'uq_payments_idempotency_key';
const RECEIPT_SEQ_PAD = 4;

interface ResolvedItem {
  service: MedicalService;
  doctor: Doctor;
}

/**
 * The core business transaction: patient → payment (+items, contract, first money movement)
 * → queue tickets (one per doctor) → kiosk request processed → audit. All or nothing.
 */
@Injectable()
export class RegistrationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly patients: PatientsService,
    private readonly payments: PaymentsService,
    private readonly queues: QueuesService,
    private readonly queueNumbers: QueueNumberService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async checkout(dto: CheckoutDto, user: AuthUser, meta: RequestMeta): Promise<CheckoutResult> {
    const existing = await this.findByIdempotencyKey(dto.idempotencyKey);
    if (existing) return this.buildResult(existing.id);

    let paymentId: string;
    try {
      paymentId = await this.dataSource.transaction('READ COMMITTED', (manager) => this.execute(manager, dto, user, meta));
    } catch (error) {
      // A concurrent request with the same key won the race → return its result.
      if (isUniqueViolation(error, IDEMPOTENCY_CONSTRAINT)) {
        const winner = await this.findByIdempotencyKey(dto.idempotencyKey);
        if (winner) return this.buildResult(winner.id);
      }
      throw error;
    }

    const result = await this.buildResult(paymentId);
    this.queues.emitUpdated(result.tickets);
    if (dto.kioskRequestId) this.realtime.kioskUpdated({ id: dto.kioskRequestId, status: KioskRequestStatus.PROCESSED });
    this.realtime.paymentUpdated({ id: paymentId, status: result.payment.status });
    return result;
  }

  private findByIdempotencyKey(key: string): Promise<Payment | null> {
    return this.dataSource.getRepository(Payment).findOne({ where: { idempotencyKey: key }, select: { id: true } });
  }

  private async buildResult(paymentId: string): Promise<CheckoutResult> {
    const payment = await this.payments.findOne(paymentId);
    const tickets = payment.queueTickets ?? [];
    const patient = await this.patients.findOne(payment.patientId);
    const receipt = await this.payments.buildReceipt(payment, tickets);
    return { patient, payment, tickets, receipt };
  }

  private async execute(manager: EntityManager, dto: CheckoutDto, user: AuthUser, meta: RequestMeta): Promise<string> {
    const tz = await this.settings.getTimezone();

    // 1. Kiosk request (locked so two registrars cannot process it twice)
    let kioskRequest: KioskRequest | null = null;
    if (dto.kioskRequestId) {
      kioskRequest = await manager
        .getRepository(KioskRequest)
        .findOne({ where: { id: dto.kioskRequestId }, lock: { mode: 'pessimistic_write' } });
      if (!kioskRequest) throw new NotFoundException('Kiosk request not found');
      if (![KioskRequestStatus.NEW, KioskRequestStatus.IN_REVIEW].includes(kioskRequest.status)) {
        throw new ConflictException(`Kiosk request is already ${kioskRequest.status}`);
      }
    }

    // 2. Services & doctors validation
    const items = await this.resolveItems(manager, dto);
    const totalAmount = sumMoney(items.map((i) => i.service.price));
    const paidAmount = roundMoney(dto.paidAmount);
    if (paidAmount > totalAmount) throw new BadRequestException(`paidAmount (${paidAmount}) exceeds total (${totalAmount})`);

    // 3. Patient
    let patient: Patient;
    if (dto.patientId) {
      const found = await manager.getRepository(Patient).findOne({ where: { id: dto.patientId } });
      if (!found) throw new NotFoundException('Patient not found');
      patient = found;
    } else if (dto.patient) {
      patient = await this.patients.createWithManager(manager, dto.patient, user.id, meta);
    } else {
      throw new BadRequestException('patientId or patient is required');
    }

    // 4. Contract (SHARTNOMA)
    let contract: Contract | null = null;
    if (dto.method === PaymentMethod.CONTRACT && dto.contractNumber) {
      const repo = manager.getRepository(Contract);
      await repo
        .createQueryBuilder()
        .insert()
        .values({ contractNumber: dto.contractNumber, organization: dto.contractOrganization ?? null })
        .orIgnore()
        .execute();
      contract = await repo.findOneOrFail({ where: { contractNumber: dto.contractNumber } });
    }

    // 5. Payment + items + first transaction
    const receiptNumber = await this.nextReceiptNumber(manager, tz);
    const state = computePaymentState({ totalAmount, paidAmount, refundedAmount: 0 });
    const paymentRepo = manager.getRepository(Payment);
    const payment = await paymentRepo.save(
      paymentRepo.create({
        receiptNumber,
        idempotencyKey: dto.idempotencyKey,
        patientId: patient.id,
        totalAmount,
        paidAmount,
        refundedAmount: 0,
        remainingAmount: state.remainingAmount,
        status: state.status,
        method: dto.method,
        contractId: contract?.id ?? null,
        note: dto.note ?? null,
        createdById: user.id,
      }),
    );
    const itemRepo = manager.getRepository(PaymentItem);
    const savedItems = await itemRepo.save(
      items.map((i) =>
        itemRepo.create({
          paymentId: payment.id,
          serviceId: i.service.id,
          serviceName: i.service.name,
          serviceCode: i.service.code,
          departmentId: i.service.departmentId,
          doctorId: i.doctor.id,
          price: i.service.price,
          quantity: 1,
          amount: i.service.price,
        }),
      ),
    );
    if (paidAmount > 0) {
      await manager.getRepository(PaymentTransaction).insert({
        paymentId: payment.id,
        type: PaymentTransactionType.PAYMENT,
        method: dto.method,
        amount: paidAmount,
        createdById: user.id,
      });
    }

    // 6. Queue tickets — one per doctor, numbered by the department prefix of its first service
    const queueDate = dateInTz(tz);
    const byDoctor = new Map<string, { doctor: Doctor; items: PaymentItem[]; services: MedicalService[] }>();
    items.forEach((it, idx) => {
      const group = byDoctor.get(it.doctor.id) ?? { doctor: it.doctor, items: [], services: [] };
      group.items.push(savedItems[idx]);
      group.services.push(it.service);
      byDoctor.set(it.doctor.id, group);
    });
    const ticketNumbers: string[] = [];
    // Allocate counters in a stable (prefix) order so concurrent checkouts cannot deadlock.
    const groups = [...byDoctor.values()].sort((a, b) =>
      a.services[0].department!.queuePrefix.localeCompare(b.services[0].department!.queuePrefix),
    );
    for (const group of groups) {
      const department = group.services[0].department!;
      const number = await this.queueNumbers.next(manager, queueDate, department.queuePrefix);
      const ticketRepo = manager.getRepository(QueueTicket);
      const ticket = await ticketRepo.save(
        ticketRepo.create({
          ticketNumber: number.ticketNumber,
          prefix: number.prefix,
          sequence: number.sequence,
          queueDate,
          status: QueueStatus.WAITING,
          patientId: patient.id,
          doctorId: group.doctor.id,
          departmentId: department.id,
          paymentId: payment.id,
          roomNumber: group.doctor.roomNumber,
          createdById: user.id,
        }),
      );
      await manager.getRepository(QueueTicketService).insert(
        group.items.map((item) => ({ ticketId: ticket.id, serviceId: item.serviceId, paymentItemId: item.id, serviceName: item.serviceName })),
      );
      ticketNumbers.push(ticket.ticketNumber);
    }

    // 7. Kiosk request → PROCESSED
    if (kioskRequest) {
      await manager.getRepository(KioskRequest).update(kioskRequest.id, {
        status: KioskRequestStatus.PROCESSED,
        processedById: user.id,
        processedAt: new Date(),
        paymentId: payment.id,
      });
    }

    // 8. Audit (same transaction)
    await this.audit.log(
      {
        userId: user.id,
        action: AuditAction.PAYMENT,
        module: AUDIT_MODULES.PAYMENTS,
        entity: 'Payment',
        entityId: payment.id,
        newValue: {
          receiptNumber,
          patientId: patient.id,
          totalAmount,
          paidAmount,
          method: dto.method,
          status: state.status,
          contractNumber: contract?.contractNumber ?? null,
          services: items.map((i) => i.service.code),
          tickets: ticketNumbers,
          kioskRequest: kioskRequest?.number ?? null,
        },
        description: `Payment ${receiptNumber}: ${totalAmount} UZS (${dto.method}), tickets ${ticketNumbers.join(', ')}`,
        meta,
      },
      manager,
    );
    await this.audit.log(
      {
        userId: user.id,
        action: AuditAction.CREATE,
        module: AUDIT_MODULES.QUEUES,
        entity: 'QueueTicket',
        entityId: payment.id,
        newValue: { tickets: ticketNumbers, queueDate },
        description: `Queue tickets created: ${ticketNumbers.join(', ')}`,
        meta,
      },
      manager,
    );
    return payment.id;
  }

  private async resolveItems(manager: EntityManager, dto: CheckoutDto): Promise<ResolvedItem[]> {
    const pairs = new Set(dto.items.map((i) => `${i.serviceId}:${i.doctorId}`));
    if (pairs.size !== dto.items.length) throw new BadRequestException('Duplicate service/doctor pair in items');
    const serviceIds = [...new Set(dto.items.map((i) => i.serviceId))];
    const doctorIds = [...new Set(dto.items.map((i) => i.doctorId))];

    const services = await manager.getRepository(MedicalService).find({ where: { id: In(serviceIds) }, relations: { department: true } });
    const doctors = await manager.getRepository(Doctor).find({ where: { id: In(doctorIds) }, relations: { user: true } });
    const links = await manager.getRepository(DoctorService).find({ where: { serviceId: In(serviceIds), doctorId: In(doctorIds) } });
    const linkSet = new Set(links.map((l) => `${l.serviceId}:${l.doctorId}`));

    return dto.items.map((item) => {
      const service = services.find((s) => s.id === item.serviceId);
      if (!service) throw new BadRequestException(`Service ${item.serviceId} not found`);
      if (!service.isActive || !service.department?.isActive) throw new BadRequestException(`Service "${service.name}" is not active`);
      const doctor = doctors.find((d) => d.id === item.doctorId);
      if (!doctor) throw new BadRequestException(`Doctor ${item.doctorId} not found`);
      const doctorName = `${doctor.user?.lastName ?? ''} ${doctor.user?.firstName ?? ''}`.trim();
      if (doctor.user?.status !== UserStatus.ACTIVE) throw new BadRequestException(`Doctor ${doctorName} is not active`);
      if (!doctor.isAvailable) throw new BadRequestException(`Doctor ${doctorName} is not accepting patients now`);
      if (!linkSet.has(`${service.id}:${doctor.id}`)) {
        throw new BadRequestException(`Doctor ${doctorName} does not provide "${service.name}"`);
      }
      return { service, doctor };
    });
  }

  private async nextReceiptNumber(manager: EntityManager, tz: string): Promise<string> {
    const rows: { seq: string }[] = await manager.query(`SELECT nextval('${SEQUENCES.RECEIPT_NUMBER}') AS seq`);
    const day = dateInTz(tz).replace(/-/g, '');
    return `R-${day}-${String(rows[0].seq).padStart(RECEIPT_SEQ_PAD, '0')}`;
  }
}

