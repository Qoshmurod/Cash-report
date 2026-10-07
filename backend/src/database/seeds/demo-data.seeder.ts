import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { EntityManager } from 'typeorm';
import {
  Gender,
  PaymentMethod,
  PaymentTransactionType,
  QueueStatus,
  UserStatus,
  VisitStatus,
} from '../../common/constants/enums';
import { roundMoney } from '../../common/utils/money.util';
import { Department } from '../../modules/departments/entities/department.entity';
import { Doctor } from '../../modules/doctors/entities/doctor.entity';
import { Patient } from '../../modules/patients/entities/patient.entity';
import { computePaymentState } from '../../modules/payments/domain/payment-status';
import { Contract } from '../../modules/payments/entities/contract.entity';
import { PaymentItem } from '../../modules/payments/entities/payment-item.entity';
import { PaymentTransaction } from '../../modules/payments/entities/payment-transaction.entity';
import { Payment } from '../../modules/payments/entities/payment.entity';
import { QueueTicketService } from '../../modules/queues/entities/queue-ticket-service.entity';
import { QueueTicket } from '../../modules/queues/entities/queue-ticket.entity';
import { MedicalService } from '../../modules/services/entities/service.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Visit } from '../../modules/visits/entities/visit.entity';
import { DEMO_ADDRESSES, DEMO_CONTRACTS, DEMO_FIRST_NAMES_FEMALE, DEMO_FIRST_NAMES_MALE, DEMO_LAST_NAMES } from './seed-data';

const logger = new Logger('DemoSeeder');

const DEMO_DAYS = 60;
const MINUTE = 60_000;
const OPEN_HOUR = 8;
const WORK_MINUTES = 9 * 60;
const TODAY_WAITING = 6;

/** Deterministic PRNG (mulberry32) — the same demo data on every fresh database. */
const prng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

interface DoctorWithServices {
  doctor: Doctor;
  services: MedicalService[];
}

/**
 * Generates ~60 days of realistic history (patients, payments, transactions, tickets, visits)
 * so the dashboard and reports have data. Skipped when any payment already exists.
 */
export const seedDemoData = async (manager: EntityManager, tz: string): Promise<void> => {
  if ((await manager.getRepository(Payment).count()) > 0) {
    logger.log('Demo data skipped (payments already exist)');
    return;
  }
  const rand = prng(20261001);
  const pickOne = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const between = (min: number, max: number): number => min + Math.floor(rand() * (max - min + 1));

  const registrar = await manager.getRepository(User).findOne({ where: { login: 'registrar01' } });
  const departments = await manager.getRepository(Department).find();
  const depById = new Map(departments.map((d) => [d.id, d]));
  const doctorsRaw = await manager
    .getRepository(Doctor)
    .createQueryBuilder('d')
    .innerJoin('d.user', 'u', 'u.status = :s', { s: UserStatus.ACTIVE })
    .leftJoinAndSelect('d.doctorServices', 'ds')
    .leftJoinAndSelect('ds.service', 'svc')
    .getMany();
  const doctors: DoctorWithServices[] = doctorsRaw
    .map((doctor) => ({ doctor, services: (doctor.doctorServices ?? []).map((ds) => ds.service!).filter(Boolean) }))
    .filter((d) => d.services.length > 0);
  if (!doctors.length) return;
  const labDoctor = doctors.find((d) => d.services.some((s) => s.code.startsWith('LAB')));

  const contracts: Contract[] = [];
  for (const c of DEMO_CONTRACTS) {
    const repo = manager.getRepository(Contract);
    contracts.push((await repo.findOne({ where: { contractNumber: c.contractNumber } })) ?? (await repo.save(repo.create(c))));
  }

  const now = new Date();
  const todayLocal = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const patientsPool: Patient[] = [];
  const counters = new Map<string, number>();
  let receiptSeq = 0;
  let totalPayments = 0;

  for (let offset = DEMO_DAYS; offset >= 0; offset -= 1) {
    const dayDate = new Date(`${todayLocal}T12:00:00Z`);
    dayDate.setUTCDate(dayDate.getUTCDate() - offset);
    const day = dayDate.toISOString().slice(0, 10);
    const weekday = dayDate.getUTCDay(); // 0 = Sunday
    if (weekday === 0) continue;
    const isToday = offset === 0;
    const open = fromZonedTime(`${day}T0${OPEN_HOUR}:00:00`, tz);
    const windowMinutes = isToday ? Math.max(30, Math.min(WORK_MINUTES, Math.floor((now.getTime() - open.getTime()) / MINUTE))) : WORK_MINUTES;
    const count = isToday ? between(12, 16) : weekday === 6 ? between(4, 9) : between(8, 18);
    const arrivals = Array.from({ length: count }, () => between(0, windowMinutes - 1)).sort((a, b) => a - b);

    const patients: Patient[] = [];
    const payments: Payment[] = [];
    const items: PaymentItem[] = [];
    const txs: PaymentTransaction[] = [];
    const tickets: QueueTicket[] = [];
    const ticketServices: QueueTicketService[] = [];
    const visits: Visit[] = [];

    arrivals.forEach((minute, idx) => {
      const createdAt = new Date(Math.min(open.getTime() + minute * MINUTE, now.getTime() - MINUTE));
      // Patient: new or returning
      let patient: Patient;
      if (patientsPool.length > 20 && rand() < 0.3) {
        patient = pickOne(patientsPool);
      } else {
        const gender = rand() < 0.5 ? Gender.MALE : Gender.FEMALE;
        const lastName = pickOne(DEMO_LAST_NAMES);
        patient = manager.getRepository(Patient).create({
          id: randomUUID(),
          firstName: pickOne(gender === Gender.MALE ? DEMO_FIRST_NAMES_MALE : DEMO_FIRST_NAMES_FEMALE),
          lastName: gender === Gender.FEMALE ? `${lastName}a` : lastName,
          gender,
          birthDate: `${between(1950, 2018)}-${String(between(1, 12)).padStart(2, '0')}-${String(between(1, 28)).padStart(2, '0')}`,
          phone: `+99890${between(1000000, 9999999)}`,
          address: pickOne(DEMO_ADDRESSES),
          passport: rand() < 0.6 ? `A${pickOne(['A', 'B', 'D'])}${between(1000000, 9999999)}` : null,
          createdById: registrar?.id ?? null,
          createdAt,
          updatedAt: createdAt,
        });
        patients.push(patient);
        patientsPool.push(patient);
      }

      // Services: one doctor, 1-2 of their services, sometimes + a lab test
      const main = pickOne(doctors);
      const chosen: { doctor: Doctor; service: MedicalService }[] = [];
      const svcCount = Math.min(main.services.length, rand() < 0.65 ? 1 : 2);
      const shuffled = [...main.services].sort(() => rand() - 0.5);
      for (let i = 0; i < svcCount; i += 1) chosen.push({ doctor: main.doctor, service: shuffled[i] });
      if (labDoctor && labDoctor !== main && rand() < 0.3) chosen.push({ doctor: labDoctor.doctor, service: pickOne(labDoctor.services) });

      const total = roundMoney(chosen.reduce((a, c) => a + c.service.price, 0));
      const r = rand();
      const method = r < 0.55 ? PaymentMethod.CASH : r < 0.9 ? PaymentMethod.CARD : PaymentMethod.CONTRACT;
      let paid = total;
      if (method === PaymentMethod.CONTRACT && rand() < 0.5) paid = 0;
      if (method === PaymentMethod.CASH && rand() < 0.05) paid = roundMoney(Math.round(total / 2 / 1000) * 1000);
      const outcome = rand();
      const refunded = !isToday && paid === total && outcome < 0.03;
      const cancelled = !refunded && paid === 0 && outcome < 0.2;

      receiptSeq += 1;
      const state = computePaymentState({ totalAmount: total, paidAmount: paid, refundedAmount: refunded ? paid : 0, cancelled });
      const payment = manager.getRepository(Payment).create({
        id: randomUUID(),
        receiptNumber: `R-${day.replace(/-/g, '')}-D${String(receiptSeq).padStart(4, '0')}`,
        idempotencyKey: null,
        patientId: patient.id,
        totalAmount: total,
        paidAmount: paid,
        refundedAmount: refunded ? paid : 0,
        remainingAmount: state.remainingAmount,
        status: state.status,
        method,
        contractId: method === PaymentMethod.CONTRACT ? pickOne(contracts).id : null,
        note: null,
        cancelReason: cancelled ? 'Bemor xizmatdan voz kechdi' : null,
        createdById: registrar?.id ?? null,
        createdAt,
        updatedAt: createdAt,
      });
      payments.push(payment);
      if (paid > 0) {
        txs.push(
          manager.getRepository(PaymentTransaction).create({
            id: randomUUID(), paymentId: payment.id, type: PaymentTransactionType.PAYMENT, method, amount: paid,
            note: null, createdById: registrar?.id ?? null, createdAt,
          }),
        );
      }
      if (refunded) {
        txs.push(
          manager.getRepository(PaymentTransaction).create({
            id: randomUUID(), paymentId: payment.id, type: PaymentTransactionType.REFUND, method, amount: paid,
            note: 'Xizmat ko‘rsatilmadi', createdById: registrar?.id ?? null, createdAt: new Date(createdAt.getTime() + 30 * MINUTE),
          }),
        );
      }

      const savedItems = chosen.map((c) =>
        manager.getRepository(PaymentItem).create({
          id: randomUUID(), paymentId: payment.id, serviceId: c.service.id, serviceName: c.service.name, serviceCode: c.service.code,
          departmentId: c.service.departmentId, doctorId: c.doctor.id, price: c.service.price, quantity: 1, amount: c.service.price,
        }),
      );
      items.push(...savedItems);

      // Tickets per doctor
      const byDoctor = new Map<string, number[]>();
      chosen.forEach((c, i) => byDoctor.set(c.doctor.id, [...(byDoctor.get(c.doctor.id) ?? []), i]));
      for (const [doctorId, idxs] of byDoctor) {
        const first = chosen[idxs[0]];
        const dep = depById.get(first.service.departmentId)!;
        const key = `${day}|${dep.queuePrefix}`;
        const seq = (counters.get(key) ?? 0) + 1;
        counters.set(key, seq);
        const waitingToday = isToday && idx >= count - TODAY_WAITING;
        let status = QueueStatus.COMPLETED;
        if (refunded || cancelled) status = QueueStatus.CANCELLED;
        else if (waitingToday) status = QueueStatus.WAITING;
        else if (rand() < 0.04) status = QueueStatus.SKIPPED;
        const calledAt = status === QueueStatus.COMPLETED || status === QueueStatus.SKIPPED ? new Date(createdAt.getTime() + between(5, 40) * MINUTE) : null;
        const startedAt = status === QueueStatus.COMPLETED && calledAt ? new Date(calledAt.getTime() + between(1, 3) * MINUTE) : null;
        const duration = idxs.reduce((a, i) => a + chosen[i].service.durationMinutes, 0);
        const completedAt = startedAt ? new Date(startedAt.getTime() + between(Math.max(5, duration - 5), duration + 10) * MINUTE) : null;
        const clamp = (d: Date | null): Date | null => (d && d.getTime() > now.getTime() ? new Date(now.getTime() - MINUTE) : d);
        const ticket = manager.getRepository(QueueTicket).create({
          id: randomUUID(),
          ticketNumber: `${dep.queuePrefix}${seq}`,
          prefix: dep.queuePrefix,
          sequence: seq,
          queueDate: day,
          status,
          patientId: patient.id,
          doctorId,
          departmentId: dep.id,
          paymentId: payment.id,
          roomNumber: first.doctor.roomNumber,
          calledAt: clamp(calledAt),
          calledCount: calledAt ? 1 : 0,
          calledById: calledAt ? first.doctor.userId : null,
          startedAt: clamp(startedAt),
          completedAt: clamp(completedAt),
          cancelReason: status === QueueStatus.CANCELLED ? (refunded ? 'Refund' : 'Payment cancelled') : null,
          createdById: registrar?.id ?? null,
          createdAt,
          updatedAt: clamp(completedAt) ?? createdAt,
        });
        tickets.push(ticket);
        for (const i of idxs) {
          ticketServices.push(
            manager.getRepository(QueueTicketService).create({
              id: randomUUID(), ticketId: ticket.id, serviceId: chosen[i].service.id, paymentItemId: savedItems[i].id, serviceName: chosen[i].service.name,
            }),
          );
        }
        if (status === QueueStatus.COMPLETED && ticket.startedAt) {
          visits.push(
            manager.getRepository(Visit).create({
              id: randomUUID(), queueTicketId: ticket.id, patientId: patient.id, doctorId, status: VisitStatus.COMPLETED,
              startedAt: ticket.startedAt, endedAt: ticket.completedAt, complaint: null, diagnosis: null, notes: null, createdAt: ticket.startedAt,
            }),
          );
        }
      }
    });

    if (patients.length) await manager.getRepository(Patient).insert(patients);
    if (payments.length) await manager.getRepository(Payment).insert(payments);
    if (items.length) await manager.getRepository(PaymentItem).insert(items);
    if (txs.length) await manager.getRepository(PaymentTransaction).insert(txs);
    if (tickets.length) await manager.getRepository(QueueTicket).insert(tickets);
    if (ticketServices.length) await manager.getRepository(QueueTicketService).insert(ticketServices);
    if (visits.length) await manager.getRepository(Visit).insert(visits);
    totalPayments += payments.length;
  }

  for (const [key, last] of counters) {
    const [queueDate, prefix] = key.split('|');
    await manager.query(
      `INSERT INTO queue_counters (queue_date, prefix, last_number) VALUES ($1, $2, $3)
       ON CONFLICT (queue_date, prefix) DO UPDATE SET last_number = GREATEST(queue_counters.last_number, EXCLUDED.last_number)`,
      [queueDate, prefix, last],
    );
  }
  logger.log(`Demo data: ${patientsPool.length} patients, ${totalPayments} payments over ${DEMO_DAYS} days`);
};
