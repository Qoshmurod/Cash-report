import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, SelectQueryBuilder } from 'typeorm';
import { AuditAction, PaymentMethod, PaymentStatus, PaymentTransactionType, QueueStatus } from '../../common/constants/enums';
import { paginated, Paginated } from '../../common/dto/paginated';
import { escapeLike, resolveSort } from '../../common/dto/pagination-query.dto';
import { createPdf, PDF_FONTS, pdfToBuffer } from '../../common/pdf/pdf.util';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { roundMoney, formatMoney } from '../../common/utils/money.util';
import { fullName, shortDoctorName } from '../../common/utils/person.util';
import { dayRangeToUtc, formatDateTime } from '../../common/utils/time.util';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService } from '../audit/audit.service';
import { QueueTicket } from '../queues/entities/queue-ticket.entity';
import { presentTicket, ticketQuery } from '../queues/queue.presenter';
import { QueuesService } from '../queues/queues.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { computePaymentState, FINAL_PAYMENT_STATUSES, refundableAmount } from './domain/payment-status';
import { AddPaymentDto, PaymentQueryDto } from './dto/payment.dto';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { Payment } from './entities/payment.entity';
import { Receipt } from './receipt.types';

const SORTS = { createdAt: 'pay.createdAt', totalAmount: 'pay.totalAmount', paidAmount: 'pay.paidAmount' };
const PATIENT_FIELDS = ['p.id', 'p.patientCode', 'p.firstName', 'p.lastName', 'p.middleName', 'p.phone', 'p.birthDate', 'p.gender'];

export const METHOD_LABELS_UZ: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'NAQD',
  [PaymentMethod.CARD]: 'KARTA',
  [PaymentMethod.CONTRACT]: 'SHARTNOMA',
};

/** 80 mm thermal paper width in PDF points. */
const RECEIPT_WIDTH = 226.77;
const RECEIPT_MARGIN = 10;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly queues: QueuesService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Applies list filters shared by /payments, /reports/payments and exports. */
  async applyFilters(qb: SelectQueryBuilder<Payment>, query: PaymentQueryDto): Promise<SelectQueryBuilder<Payment>> {
    const tz = await this.settings.getTimezone();
    if (query.status?.length) qb.andWhere('pay.status IN (:...status)', { status: query.status });
    if (query.method?.length) qb.andWhere('pay.method IN (:...method)', { method: query.method });
    if (query.patientId) qb.andWhere('pay.patientId = :patientId', { patientId: query.patientId });
    const itemFilters: string[] = [];
    if (query.doctorId) itemFilters.push('fi.doctor_id = :doctorId');
    if (query.serviceId) itemFilters.push('fi.service_id = :serviceId');
    if (query.departmentId) itemFilters.push('fi.department_id = :departmentId');
    if (itemFilters.length) {
      qb.andWhere(`EXISTS (SELECT 1 FROM payment_items fi WHERE fi.payment_id = pay.id AND ${itemFilters.join(' AND ')})`, {
        doctorId: query.doctorId,
        serviceId: query.serviceId,
        departmentId: query.departmentId,
      });
    }
    const range = dayRangeToUtc(tz, query.dateFrom, query.dateTo);
    if (range.from) qb.andWhere('pay.createdAt >= :from', { from: range.from });
    if (range.to) qb.andWhere('pay.createdAt < :to', { to: range.to });
    if (query.search) {
      qb.andWhere(
        "(pay.receiptNumber ILIKE :s ESCAPE '\\' OR p.firstName ILIKE :s ESCAPE '\\' OR p.lastName ILIKE :s ESCAPE '\\' OR p.phone ILIKE :s ESCAPE '\\' OR p.patientCode ILIKE :s ESCAPE '\\')",
        { s: `%${escapeLike(query.search)}%` },
      );
    }
    return qb;
  }

  listQuery(manager: EntityManager = this.dataSource.manager): SelectQueryBuilder<Payment> {
    return manager
      .getRepository(Payment)
      .createQueryBuilder('pay')
      .leftJoin('pay.patient', 'p')
      .addSelect(PATIENT_FIELDS)
      .leftJoinAndSelect('pay.items', 'i')
      .leftJoinAndSelect('pay.contract', 'c')
      .leftJoin('pay.createdBy', 'cb')
      .addSelect(['cb.id', 'cb.firstName', 'cb.lastName']);
  }

  async findAll(query: PaymentQueryDto): Promise<Paginated<Payment>> {
    const idsQb = this.dataSource.getRepository(Payment).createQueryBuilder('pay').leftJoin('pay.patient', 'p').select('pay.id', 'id');
    await this.applyFilters(idsQb, query);
    idsQb.orderBy(resolveSort(query.sortBy, SORTS), query.sortOrder).addOrderBy('pay.id');
    const total = await idsQb.getCount();
    const ids = (await idsQb.offset(query.skip).limit(query.limit).getRawMany<{ id: string }>()).map((r) => r.id);
    if (!ids.length) return paginated([], total, query.page, query.limit);
    const rows = await this.listQuery().where('pay.id IN (:...ids)', { ids }).getMany();
    const byId = new Map(rows.map((r) => [r.id, r]));
    return paginated(ids.map((id) => byId.get(id)).filter((r): r is Payment => Boolean(r)), total, query.page, query.limit);
  }

  async findOne(id: string, manager: EntityManager = this.dataSource.manager): Promise<Payment> {
    const payment = await this.listQuery(manager)
      .leftJoinAndSelect('i.service', 'svc')
      .leftJoinAndSelect('i.doctor', 'idoc')
      .leftJoin('idoc.user', 'idu')
      .addSelect(['idu.id', 'idu.firstName', 'idu.lastName', 'idu.middleName'])
      .leftJoinAndSelect('pay.transactions', 'tx')
      .leftJoin('tx.createdBy', 'txu')
      .addSelect(['txu.id', 'txu.firstName', 'txu.lastName'])
      .where('pay.id = :id', { id })
      .orderBy('tx.createdAt', 'ASC')
      .getOne();
    if (!payment) throw new NotFoundException('Payment not found');
    const tickets = await ticketQuery(manager).where('t.paymentId = :id', { id }).orderBy('t.createdAt', 'ASC').getMany();
    payment.queueTickets = tickets.map(presentTicket);
    return payment;
  }

  async addPayment(id: string, dto: AddPaymentDto, user: AuthUser, meta: RequestMeta): Promise<Payment> {
    const amount = roundMoney(dto.amount);
    const status = await this.dataSource.transaction(async (manager) => {
      const payment = await this.lockPayment(manager, id);
      if (FINAL_PAYMENT_STATUSES.includes(payment.status)) throw new ConflictException(`Payment is ${payment.status}`);
      if (payment.remainingAmount <= 0) throw new ConflictException('Payment is already fully paid');
      if (amount > payment.remainingAmount) {
        throw new BadRequestException(`Amount exceeds remaining balance (${payment.remainingAmount})`);
      }
      const before = { paidAmount: payment.paidAmount, status: payment.status };
      payment.paidAmount = roundMoney(payment.paidAmount + amount);
      Object.assign(payment, computePaymentState(payment));
      await manager.getRepository(Payment).update(id, {
        paidAmount: payment.paidAmount,
        remainingAmount: payment.remainingAmount,
        status: payment.status,
      });
      await manager.getRepository(PaymentTransaction).insert({
        paymentId: id,
        type: PaymentTransactionType.PAYMENT,
        method: dto.method,
        amount,
        note: dto.note ?? null,
        createdById: user.id,
      });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.PAYMENT,
          module: AUDIT_MODULES.PAYMENTS,
          entity: 'Payment',
          entityId: id,
          oldValue: before,
          newValue: { paidAmount: payment.paidAmount, status: payment.status, amount, method: dto.method },
          description: `Additional payment ${amount} (${dto.method}) for ${payment.receiptNumber}`,
          meta,
        },
        manager,
      );
      return payment.status;
    });
    this.realtime.paymentUpdated({ id, status });
    return this.findOne(id);
  }

  async refund(id: string, amountInput: number | undefined, reason: string, user: AuthUser, meta: RequestMeta): Promise<Payment> {
    const { status, cancelled } = await this.dataSource.transaction(async (manager) => {
      const payment = await this.lockPayment(manager, id);
      if (payment.status === PaymentStatus.CANCELLED) throw new ConflictException('Payment is cancelled');
      const refundable = refundableAmount(payment);
      if (refundable <= 0) throw new ConflictException('Nothing to refund');
      const amount = roundMoney(amountInput ?? refundable);
      if (amount > refundable) throw new BadRequestException(`Refund exceeds refundable amount (${refundable})`);
      const before = { refundedAmount: payment.refundedAmount, status: payment.status };
      payment.refundedAmount = roundMoney(payment.refundedAmount + amount);
      Object.assign(payment, computePaymentState(payment));
      await manager.getRepository(Payment).update(id, {
        refundedAmount: payment.refundedAmount,
        remainingAmount: payment.remainingAmount,
        status: payment.status,
      });
      await manager.getRepository(PaymentTransaction).insert({
        paymentId: id,
        type: PaymentTransactionType.REFUND,
        method: payment.method,
        amount,
        note: reason,
        createdById: user.id,
      });
      const cancelledTickets =
        payment.status === PaymentStatus.REFUNDED
          ? await this.queues.cancelTicketsOfPayment(manager, id, [QueueStatus.WAITING, QueueStatus.SKIPPED], `Refund: ${reason}`)
          : [];
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.REFUND,
          module: AUDIT_MODULES.PAYMENTS,
          entity: 'Payment',
          entityId: id,
          oldValue: before,
          newValue: { refundedAmount: payment.refundedAmount, status: payment.status, amount, reason, cancelledTickets: cancelledTickets.map((t) => t.ticketNumber) },
          description: `Refund ${amount} for ${payment.receiptNumber}: ${reason}`,
          meta,
        },
        manager,
      );
      return { status: payment.status, cancelled: cancelledTickets };
    });
    this.queues.emitUpdated(cancelled);
    this.realtime.paymentUpdated({ id, status });
    return this.findOne(id);
  }

  async cancel(id: string, reason: string, user: AuthUser, meta: RequestMeta): Promise<Payment> {
    const cancelled = await this.dataSource.transaction(async (manager) => {
      const payment = await this.lockPayment(manager, id);
      if (payment.status === PaymentStatus.CANCELLED) throw new ConflictException('Payment is already cancelled');
      if (roundMoney(payment.paidAmount - payment.refundedAmount) > 0) {
        throw new ConflictException('Payment has money received — refund it instead of cancelling');
      }
      await manager.getRepository(Payment).update(id, {
        status: PaymentStatus.CANCELLED,
        remainingAmount: 0,
        cancelReason: reason,
      });
      const tickets = await this.queues.cancelTicketsOfPayment(
        manager,
        id,
        [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.SKIPPED],
        `Payment cancelled: ${reason}`,
      );
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CANCEL,
          module: AUDIT_MODULES.PAYMENTS,
          entity: 'Payment',
          entityId: id,
          oldValue: { status: payment.status },
          newValue: { status: PaymentStatus.CANCELLED, reason, cancelledTickets: tickets.map((t) => t.ticketNumber) },
          description: `Payment ${payment.receiptNumber} cancelled: ${reason}`,
          meta,
        },
        manager,
      );
      return tickets;
    });
    this.queues.emitUpdated(cancelled);
    this.realtime.paymentUpdated({ id, status: PaymentStatus.CANCELLED });
    return this.findOne(id);
  }

  async receipt(id: string, manager: EntityManager = this.dataSource.manager): Promise<Receipt> {
    const payment = await this.findOne(id, manager);
    return this.buildReceipt(payment, payment.queueTickets ?? []);
  }

  async buildReceipt(payment: Payment, tickets: QueueTicket[]): Promise<Receipt> {
    const s = await this.settings.getAll();
    return {
      hospitalName: s.hospitalName,
      hospitalPhone: s.phone,
      hospitalAddress: s.address,
      header: s.receiptHeader,
      footer: s.receiptFooter,
      receiptNumber: payment.receiptNumber,
      date: payment.createdAt.toISOString(),
      patientName: fullName(payment.patient),
      patientCode: payment.patient?.patientCode ?? '',
      items: payment.items.map((i) => ({ name: i.serviceName, price: i.price, quantity: i.quantity, amount: i.amount })),
      totalAmount: payment.totalAmount,
      paidAmount: payment.paidAmount,
      remainingAmount: payment.remainingAmount,
      method: payment.method,
      contractNumber: payment.contract?.contractNumber ?? null,
      status: payment.status,
      cashier: payment.createdBy ? `${payment.createdBy.lastName} ${payment.createdBy.firstName}` : '',
      tickets: tickets.map((t) => ({
        ticketNumber: t.ticketNumber,
        roomNumber: t.roomNumber,
        doctorName: shortDoctorName(t.doctor?.user),
        departmentName: t.department?.name ?? '',
        services: (t.services ?? []).map((x) => x.name),
      })),
    };
  }

  /** Thermal-printer friendly (80 mm) receipt. */
  async receiptPdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
    const r = await this.receipt(id);
    const tz = await this.settings.getTimezone();
    const height = 330 + r.items.length * 26 + r.tickets.length * 95 + (r.contractNumber ? 14 : 0);
    const doc = createPdf({ size: [RECEIPT_WIDTH, height], margin: RECEIPT_MARGIN, info: { Title: `Receipt ${r.receiptNumber}` } });
    const width = RECEIPT_WIDTH - RECEIPT_MARGIN * 2;
    const line = () => {
      doc.moveDown(0.3);
      doc.font(PDF_FONTS.REGULAR).fontSize(8).text('-'.repeat(48), RECEIPT_MARGIN, doc.y, { align: 'center', width });
      doc.moveDown(0.3);
    };
    const row = (left: string, right: string, bold = false) => {
      doc.font(bold ? PDF_FONTS.BOLD : PDF_FONTS.REGULAR).fontSize(8.5);
      const y = doc.y;
      doc.text(left, RECEIPT_MARGIN, y, { width: width * 0.62 });
      const leftBottom = doc.y;
      doc.text(right, RECEIPT_MARGIN + width * 0.62, y, { width: width * 0.38, align: 'right' });
      doc.y = Math.max(leftBottom, doc.y);
    };

    doc.font(PDF_FONTS.BOLD).fontSize(12).text(r.hospitalName.toUpperCase(), { align: 'center', width });
    doc.font(PDF_FONTS.REGULAR).fontSize(7.5).text(r.hospitalAddress, { align: 'center', width }).text(r.hospitalPhone, { align: 'center', width });
    if (r.header) doc.moveDown(0.2).fontSize(7.5).text(r.header, RECEIPT_MARGIN, doc.y, { align: 'center', width });
    line();
    row('Chek:', r.receiptNumber);
    row('Sana:', formatDateTime(new Date(r.date), tz));
    row('Bemor:', r.patientName);
    row('ID:', r.patientCode);
    line();
    doc.font(PDF_FONTS.BOLD).fontSize(8.5).text('Xizmatlar', RECEIPT_MARGIN, doc.y, { width });
    for (const item of r.items) row(item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name, formatMoney(item.amount));
    line();
    row('Jami:', `${formatMoney(r.totalAmount)} UZS`, true);
    row("To'landi:", `${formatMoney(r.paidAmount)} UZS`);
    if (r.remainingAmount > 0) row('Qoldiq:', `${formatMoney(r.remainingAmount)} UZS`);
    row("To'lov turi:", METHOD_LABELS_UZ[r.method]);
    if (r.contractNumber) row('Shartnoma:', r.contractNumber);
    if (r.cashier) row('Kassir:', r.cashier);
    for (const t of r.tickets) {
      line();
      doc.font(PDF_FONTS.REGULAR).fontSize(8).text('NAVBAT RAQAMI', RECEIPT_MARGIN, doc.y, { align: 'center', width });
      doc.font(PDF_FONTS.BOLD).fontSize(26).text(t.ticketNumber, { align: 'center', width });
      doc.font(PDF_FONTS.BOLD).fontSize(10).text(`XONA: ${t.roomNumber ?? '-'}`, { align: 'center', width });
      doc.font(PDF_FONTS.REGULAR).fontSize(7.5).text(`${t.doctorName} · ${t.departmentName}`, { align: 'center', width });
    }
    line();
    if (r.footer) doc.fontSize(7.5).text(r.footer, RECEIPT_MARGIN, doc.y, { align: 'center', width });
    return { buffer: await pdfToBuffer(doc), filename: `receipt-${r.receiptNumber}.pdf` };
  }

  private async lockPayment(manager: EntityManager, id: string): Promise<Payment> {
    const payment = await manager.getRepository(Payment).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
}
