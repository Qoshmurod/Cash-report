import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { KioskRequestStatus, PaymentMethod, PaymentStatus, QueueStatus, ReportPeriod, UserStatus } from '../../common/constants/enums';
import { paginated, Paginated } from '../../common/dto/paginated';
import { resolveSort } from '../../common/dto/pagination-query.dto';
import { roundMoney } from '../../common/utils/money.util';
import { dateInTz, dayRangeToUtc, UtcRange } from '../../common/utils/time.util';
import { PaymentQueryDto } from '../payments/dto/payment.dto';
import { Payment } from '../payments/entities/payment.entity';
import { PaymentsService } from '../payments/payments.service';
import { QueueTicket } from '../queues/entities/queue-ticket.entity';
import { presentTicket, ticketQuery } from '../queues/queue.presenter';
import { SettingsService } from '../settings/settings.service';
import { QueueReportQueryDto, RevenueQueryDto, StatsQueryDto } from './dto/report.dto';
import {
  DashboardStats,
  DepartmentStat,
  DoctorStat,
  PaymentMethodStat,
  QueueSummary,
  RevenuePoint,
  RevenueSummary,
  ServiceStat,
} from './reports.types';

interface PeriodSpec {
  unit: 'day' | 'week' | 'month' | 'year';
  step: string;
  format: string;
  defaultSpanDays: number;
}

const PERIODS: Record<ReportPeriod, PeriodSpec> = {
  [ReportPeriod.DAILY]: { unit: 'day', step: '1 day', format: 'YYYY-MM-DD', defaultSpanDays: 29 },
  [ReportPeriod.WEEKLY]: { unit: 'week', step: '1 week', format: 'IYYY-"W"IW', defaultSpanDays: 7 * 11 },
  [ReportPeriod.MONTHLY]: { unit: 'month', step: '1 month', format: 'YYYY-MM', defaultSpanDays: 365 },
  [ReportPeriod.YEARLY]: { unit: 'year', step: '1 year', format: 'YYYY', defaultSpanDays: 365 * 4 },
};

/** Payments that count as rendered services (not cancelled / fully refunded). */
const BILLABLE_EXCLUDED = [PaymentStatus.CANCELLED, PaymentStatus.REFUNDED];
const TOP_SERVICES_LIMIT = 10;
const MAX_SERIES_POINTS = 400;

const num = (v: unknown): number => roundMoney(Number(v ?? 0));
const SIGNED_AMOUNT = `CASE WHEN tx.type = 'PAYMENT' THEN tx.amount ELSE -tx.amount END`;

const shiftDays = (day: string, days: number): string => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly settings: SettingsService,
    private readonly payments: PaymentsService,
  ) {}

  private async tz(): Promise<string> {
    return this.settings.getTimezone();
  }

  // ─────────────── Revenue ───────────────

  async revenueSeries(query: RevenueQueryDto): Promise<RevenuePoint[]> {
    const tz = await this.tz();
    const spec = PERIODS[query.period];
    const today = dateInTz(tz);
    const to = query.dateTo?.slice(0, 10) ?? today;
    let from = query.dateFrom?.slice(0, 10) ?? shiftDays(to, -spec.defaultSpanDays);
    if (query.period === ReportPeriod.DAILY && (Date.parse(to) - Date.parse(from)) / 86_400_000 > MAX_SERIES_POINTS) {
      from = shiftDays(to, -MAX_SERIES_POINTS);
    }
    const range = dayRangeToUtc(tz, from, to);
    const rows: { period: string; method: PaymentMethod | null; amount: string; count: string }[] = await this.dataSource.query(
      `WITH buckets AS (
         SELECT generate_series(date_trunc($1, $2::timestamp), date_trunc($1, $3::timestamp), $4::interval) AS b
       ), tx AS (
         SELECT date_trunc($1, t.created_at AT TIME ZONE $5) AS b, t.method, t.type, t.amount, t.payment_id
         FROM payment_transactions t
         WHERE t.created_at >= $6 AND t.created_at < $7
       )
       SELECT to_char(buckets.b, $8) AS period, tx.method,
              COALESCE(SUM(${SIGNED_AMOUNT}), 0) AS amount,
              COUNT(DISTINCT tx.payment_id) FILTER (WHERE tx.type = 'PAYMENT') AS count
       FROM buckets LEFT JOIN tx ON tx.b = buckets.b
       GROUP BY buckets.b, tx.method
       ORDER BY buckets.b`,
      [spec.unit, from, to, spec.step, tz, range.from, range.to, spec.format],
    );
    const points = new Map<string, RevenuePoint>();
    for (const r of rows) {
      const p = points.get(r.period) ?? { period: r.period, cash: 0, card: 0, contract: 0, total: 0, count: 0 };
      const amount = num(r.amount);
      if (r.method === PaymentMethod.CASH) p.cash = roundMoney(p.cash + amount);
      if (r.method === PaymentMethod.CARD) p.card = roundMoney(p.card + amount);
      if (r.method === PaymentMethod.CONTRACT) p.contract = roundMoney(p.contract + amount);
      if (r.method) {
        p.total = roundMoney(p.total + amount);
        p.count += Number(r.count);
      }
      points.set(r.period, p);
    }
    return [...points.values()];
  }

  /** Cash-flow summary of transactions in [from, to) (optionally restricted to a payment id subquery). */
  async revenueSummary(range: UtcRange, paymentFilterSql?: { sql: string; params: unknown[] }): Promise<RevenueSummary> {
    const params: unknown[] = [range.from ?? null, range.to ?? null];
    let extra = '';
    if (paymentFilterSql) {
      extra = ` AND tx.payment_id IN (${paymentFilterSql.sql.replace(/\$(\d+)/g, (_m, n: string) => `$${Number(n) + 2}`)})`;
      params.push(...paymentFilterSql.params);
    }
    const rows: { method: PaymentMethod; net: string; refunded: string }[] = await this.dataSource.query(
      `SELECT tx.method,
              COALESCE(SUM(${SIGNED_AMOUNT}), 0) AS net,
              COALESCE(SUM(tx.amount) FILTER (WHERE tx.type = 'REFUND'), 0) AS refunded
       FROM payment_transactions tx
       WHERE ($1::timestamptz IS NULL OR tx.created_at >= $1) AND ($2::timestamptz IS NULL OR tx.created_at < $2)${extra}
       GROUP BY tx.method`,
      params,
    );
    const paymentParams: unknown[] = [range.from ?? null, range.to ?? null, BILLABLE_EXCLUDED];
    let paymentExtra = '';
    if (paymentFilterSql) {
      paymentExtra = ` AND p.id IN (${paymentFilterSql.sql.replace(/\$(\d+)/g, (_m, n: string) => `$${Number(n) + 3}`)})`;
      paymentParams.push(...paymentFilterSql.params);
    }
    const [counts]: { count: string; debt: string }[] = await this.dataSource.query(
      `SELECT COUNT(*) FILTER (WHERE p.status <> 'CANCELLED') AS count,
              COALESCE(SUM(p.remaining_amount) FILTER (WHERE NOT (p.status = ANY($3::payment_status[]))), 0) AS debt
       FROM payments p
       WHERE ($1::timestamptz IS NULL OR p.created_at >= $1) AND ($2::timestamptz IS NULL OR p.created_at < $2)${paymentExtra}`,
      paymentParams,
    );
    const summary: RevenueSummary = { cash: 0, card: 0, contract: 0, total: 0, refunded: 0, count: Number(counts.count), debt: num(counts.debt) };
    for (const r of rows) {
      const net = num(r.net);
      if (r.method === PaymentMethod.CASH) summary.cash = net;
      if (r.method === PaymentMethod.CARD) summary.card = net;
      if (r.method === PaymentMethod.CONTRACT) summary.contract = net;
      summary.total = roundMoney(summary.total + net);
      summary.refunded = roundMoney(summary.refunded + num(r.refunded));
    }
    return summary;
  }

  // ─────────────── Payments report ───────────────

  async paymentsReport(query: PaymentQueryDto): Promise<Paginated<Payment>> {
    const list = await this.payments.findAll(query);
    const idsQb = this.dataSource.getRepository(Payment).createQueryBuilder('pay').leftJoin('pay.patient', 'p').select('pay.id');
    await this.payments.applyFilters(idsQb, query);
    const [sql, params] = idsQb.getQueryAndParameters();
    const summary = await this.revenueSummary({}, { sql, params });
    return paginated(list.items, list.meta.total, list.meta.page, list.meta.limit, { summary });
  }

  // ─────────────── Aggregates ───────────────

  async serviceStats(query: StatsQueryDto, limit?: number): Promise<ServiceStat[]> {
    const range = dayRangeToUtc(await this.tz(), query.dateFrom, query.dateTo);
    const rows: { service_id: string; name: string; code: string; department_name: string; count: string; amount: string }[] =
      await this.dataSource.query(
        `SELECT s.id AS service_id, s.name, s.code, d.name AS department_name,
                COUNT(i.id) AS count, COALESCE(SUM(i.amount), 0) AS amount
         FROM payment_items i
         JOIN payments p ON p.id = i.payment_id
         JOIN services s ON s.id = i.service_id
         JOIN departments d ON d.id = s.department_id
         WHERE NOT (p.status = ANY($1::payment_status[]))
           AND ($2::timestamptz IS NULL OR p.created_at >= $2) AND ($3::timestamptz IS NULL OR p.created_at < $3)
           AND ($4::uuid IS NULL OR s.department_id = $4)
         GROUP BY s.id, s.name, s.code, d.name
         ORDER BY count DESC, amount DESC
         ${limit ? `LIMIT ${Number(limit)}` : ''}`,
        [BILLABLE_EXCLUDED, range.from ?? null, range.to ?? null, query.departmentId ?? null],
      );
    return rows.map((r) => ({
      serviceId: r.service_id,
      name: r.name,
      code: r.code,
      departmentName: r.department_name,
      count: Number(r.count),
      amount: num(r.amount),
    }));
  }

  async doctorStats(query: StatsQueryDto): Promise<DoctorStat[]> {
    const tz = await this.tz();
    const range = dayRangeToUtc(tz, query.dateFrom, query.dateTo);
    const rows: {
      doctor_id: string; first_name: string; last_name: string; specialty: string; room_number: string;
      services_count: string; amount: string; patients_served: string;
    }[] = await this.dataSource.query(
      `SELECT doc.id AS doctor_id, u.first_name, u.last_name, doc.specialty, doc.room_number,
              COALESCE(items.cnt, 0) AS services_count, COALESCE(items.amount, 0) AS amount,
              COALESCE(served.cnt, 0) AS patients_served
       FROM doctors doc
       JOIN users u ON u.id = doc.user_id
       LEFT JOIN (
         SELECT i.doctor_id, COUNT(*) AS cnt, SUM(i.amount) AS amount
         FROM payment_items i JOIN payments p ON p.id = i.payment_id
         WHERE NOT (p.status = ANY($1::payment_status[]))
           AND ($2::timestamptz IS NULL OR p.created_at >= $2) AND ($3::timestamptz IS NULL OR p.created_at < $3)
         GROUP BY i.doctor_id
       ) items ON items.doctor_id = doc.id
       LEFT JOIN (
         SELECT t.doctor_id, COUNT(*) AS cnt FROM queue_tickets t
         WHERE t.status = 'COMPLETED'
           AND ($2::timestamptz IS NULL OR t.completed_at >= $2) AND ($3::timestamptz IS NULL OR t.completed_at < $3)
         GROUP BY t.doctor_id
       ) served ON served.doctor_id = doc.id
       WHERE ($4::uuid IS NULL OR EXISTS (SELECT 1 FROM doctor_services ds JOIN services s ON s.id = ds.service_id WHERE ds.doctor_id = doc.id AND s.department_id = $4))
       ORDER BY amount DESC, u.last_name`,
      [BILLABLE_EXCLUDED, range.from ?? null, range.to ?? null, query.departmentId ?? null],
    );
    return rows.map((r) => ({
      doctorId: r.doctor_id,
      name: `Dr. ${r.last_name} ${r.first_name}`,
      specialty: r.specialty,
      roomNumber: r.room_number,
      servicesCount: Number(r.services_count),
      patientsServed: Number(r.patients_served),
      amount: num(r.amount),
    }));
  }

  async departmentStats(query: StatsQueryDto): Promise<DepartmentStat[]> {
    const range = dayRangeToUtc(await this.tz(), query.dateFrom, query.dateTo);
    const rows: { department_id: string; name: string; services_count: string; amount: string; patients: string }[] =
      await this.dataSource.query(
        `SELECT d.id AS department_id, d.name,
                COALESCE(agg.services_count, 0) AS services_count, COALESCE(agg.amount, 0) AS amount,
                COALESCE(agg.patients, 0) AS patients
         FROM departments d
         LEFT JOIN (
           SELECT i.department_id, COUNT(i.id) AS services_count, SUM(i.amount) AS amount, COUNT(DISTINCT p.patient_id) AS patients
           FROM payment_items i JOIN payments p ON p.id = i.payment_id
           WHERE NOT (p.status = ANY($1::payment_status[]))
             AND ($2::timestamptz IS NULL OR p.created_at >= $2) AND ($3::timestamptz IS NULL OR p.created_at < $3)
           GROUP BY i.department_id
         ) agg ON agg.department_id = d.id
         WHERE ($4::uuid IS NULL OR d.id = $4)
         ORDER BY amount DESC, d.sort_order`,
        [BILLABLE_EXCLUDED, range.from ?? null, range.to ?? null, query.departmentId ?? null],
      );
    return rows.map((r) => ({
      departmentId: r.department_id,
      name: r.name,
      servicesCount: Number(r.services_count),
      amount: num(r.amount),
      patients: Number(r.patients),
    }));
  }

  async paymentMethodStats(range: UtcRange): Promise<PaymentMethodStat[]> {
    const rows: { method: PaymentMethod; amount: string; count: string }[] = await this.dataSource.query(
      `SELECT tx.method, COALESCE(SUM(${SIGNED_AMOUNT}), 0) AS amount,
              COUNT(DISTINCT tx.payment_id) FILTER (WHERE tx.type = 'PAYMENT') AS count
       FROM payment_transactions tx
       WHERE ($1::timestamptz IS NULL OR tx.created_at >= $1) AND ($2::timestamptz IS NULL OR tx.created_at < $2)
       GROUP BY tx.method`,
      [range.from ?? null, range.to ?? null],
    );
    return Object.values(PaymentMethod).map((method) => {
      const r = rows.find((x) => x.method === method);
      return { method, amount: num(r?.amount), count: Number(r?.count ?? 0) };
    });
  }

  // ─────────────── Queues ───────────────

  async queueReport(query: QueueReportQueryDto): Promise<Paginated<QueueTicket>> {
    const where: string[] = ['1=1'];
    const params: Record<string, unknown> = {};
    if (query.dateFrom) {
      where.push('t.queueDate >= :from');
      params.from = query.dateFrom.slice(0, 10);
    }
    if (query.dateTo) {
      where.push('t.queueDate <= :to');
      params.to = query.dateTo.slice(0, 10);
    }
    if (query.doctorId) {
      where.push('t.doctorId = :doctorId');
      params.doctorId = query.doctorId;
    }
    if (query.departmentId) {
      where.push('t.departmentId = :departmentId');
      params.departmentId = query.departmentId;
    }
    const whereNoStatus = where.join(' AND ');
    if (query.status?.length) {
      where.push('t.status IN (:...status)');
      params.status = query.status;
    }
    const repo = this.dataSource.getRepository(QueueTicket);
    const sort = resolveSort(query.sortBy, { createdAt: 't.createdAt', sequence: 't.sequence', queueDate: 't.queueDate' });
    const idsQb = repo.createQueryBuilder('t').select('t.id', 'id').where(where.join(' AND '), params).orderBy(sort, query.sortOrder).addOrderBy('t.id');
    const total = await idsQb.getCount();
    const ids = (await idsQb.offset(query.skip).limit(query.limit).getRawMany<{ id: string }>()).map((r) => r.id);
    const rows = ids.length ? await ticketQuery(this.dataSource.manager).where('t.id IN (:...ids)', { ids }).getMany() : [];
    const byId = new Map(rows.map((t) => [t.id, presentTicket(t)]));

    const agg = await repo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(whereNoStatus, params)
      .groupBy('t.status')
      .getRawMany<{ status: QueueStatus; count: string }>();
    const avg = await repo
      .createQueryBuilder('t')
      .select('AVG(EXTRACT(EPOCH FROM (t.calledAt - t.createdAt)) / 60)', 'wait')
      .addSelect('AVG(EXTRACT(EPOCH FROM (t.completedAt - t.startedAt)) / 60) FILTER (WHERE t.completedAt IS NOT NULL)', 'service')
      .where(whereNoStatus, params)
      .andWhere('t.calledAt IS NOT NULL')
      .getRawOne<{ wait: string | null; service: string | null }>();
    const summary: QueueSummary = {
      WAITING: 0, CALLED: 0, IN_PROGRESS: 0, COMPLETED: 0, SKIPPED: 0, CANCELLED: 0,
      avgWaitMinutes: avg?.wait ? Math.round(Number(avg.wait) * 10) / 10 : null,
      avgServiceMinutes: avg?.service ? Math.round(Number(avg.service) * 10) / 10 : null,
    };
    for (const a of agg) summary[a.status] = Number(a.count);
    return paginated(ids.map((id) => byId.get(id)).filter((t): t is QueueTicket => Boolean(t)), total, query.page, query.limit, { summary });
  }

  // ─────────────── Dashboard ───────────────

  async dashboard(): Promise<DashboardStats> {
    const tz = await this.tz();
    const today = dateInTz(tz);
    const todayRange = dayRangeToUtc(tz, today, today);
    const monthStart = `${today.slice(0, 8)}01`;
    const monthRange = dayRangeToUtc(tz, monthStart, today);
    const monthQuery: StatsQueryDto = { dateFrom: monthStart, dateTo: today };

    const [counts] = await this.dataSource.query<Record<string, string>[]>(
      `SELECT
         (SELECT COUNT(DISTINCT p.patient_id) FROM payments p WHERE p.status <> 'CANCELLED' AND p.created_at >= $1 AND p.created_at < $2) AS patients,
         (SELECT COUNT(*) FROM patients pt WHERE pt.created_at >= $1 AND pt.created_at < $2) AS new_patients,
         (SELECT COUNT(*) FROM payment_items i JOIN payments p ON p.id = i.payment_id
            WHERE p.status <> 'CANCELLED' AND p.created_at >= $1 AND p.created_at < $2) AS services,
         (SELECT COUNT(*) FROM payments p WHERE p.status <> 'CANCELLED' AND p.created_at >= $1 AND p.created_at < $2) AS payments,
         (SELECT COUNT(*) FROM queue_tickets t WHERE t.queue_date = $3 AND t.status = 'WAITING') AS waiting,
         (SELECT COUNT(*) FROM queue_tickets t WHERE t.queue_date = $3 AND t.status IN ('CALLED', 'IN_PROGRESS')) AS in_progress,
         (SELECT COUNT(*) FROM queue_tickets t WHERE t.queue_date = $3 AND t.status = 'COMPLETED') AS completed,
         (SELECT COUNT(*) FROM doctors d JOIN users u ON u.id = d.user_id WHERE d.is_available = true AND u.status = $4) AS active_doctors,
         (SELECT COUNT(*) FROM kiosk_requests k WHERE k.status = ANY($5::kiosk_request_status[])) AS pending_kiosk`,
      [todayRange.from, todayRange.to, today, UserStatus.ACTIVE, [KioskRequestStatus.NEW, KioskRequestStatus.IN_REVIEW]],
    );

    const [revenue, revenueLast30Days, paymentMethods, topServices, doctors, departments] = await Promise.all([
      this.revenueSummary(todayRange),
      this.revenueSeries({ period: ReportPeriod.DAILY, dateFrom: shiftDays(today, -29), dateTo: today }),
      this.paymentMethodStats(monthRange),
      this.serviceStats(monthQuery, TOP_SERVICES_LIMIT),
      this.doctorStats(monthQuery),
      this.departmentStats(monthQuery),
    ]);

    return {
      today: {
        patients: Number(counts.patients),
        newPatients: Number(counts.new_patients),
        services: Number(counts.services),
        payments: Number(counts.payments),
        revenue,
        waiting: Number(counts.waiting),
        inProgress: Number(counts.in_progress),
        completed: Number(counts.completed),
        activeDoctors: Number(counts.active_doctors),
        pendingKioskRequests: Number(counts.pending_kiosk),
      },
      revenueLast30Days,
      paymentMethods,
      topServices,
      doctors,
      departments,
    };
  }
}
