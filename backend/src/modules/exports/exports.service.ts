import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditAction, ExportFormat, Gender, PaymentMethod, PaymentStatus, QueueStatus, ReportType } from '../../common/constants/enums';
import { RequestMeta } from '../../common/types/auth.types';
import { formatMoney } from '../../common/utils/money.util';
import { fullName, shortDoctorName } from '../../common/utils/person.util';
import { formatDate, formatDateTime } from '../../common/utils/time.util';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService } from '../audit/audit.service';
import { AuditQueryDto } from '../audit/dto/audit-query.dto';
import { LoginHistoryQueryDto } from '../login-history/dto/login-history-query.dto';
import { LoginHistoryService } from '../login-history/login-history.service';
import { PatientQueryDto } from '../patients/dto/patient.dto';
import { PatientsService } from '../patients/patients.service';
import { PaymentQueryDto } from '../payments/dto/payment.dto';
import { Payment } from '../payments/entities/payment.entity';
import { METHOD_LABELS_UZ, PaymentsService } from '../payments/payments.service';
import { QueueReportQueryDto } from '../reports/dto/report.dto';
import { ReportsService } from '../reports/reports.service';
import { SettingsService } from '../settings/settings.service';
import { ExportQueryDto } from './dto/export-query.dto';
import { renderPdf } from './renderers/pdf.renderer';
import { ReportTable } from './renderers/report-table';
import { renderXlsx } from './renderers/xlsx.renderer';

/** Hard cap to keep exports bounded in memory/time. */
const EXPORT_MAX_ROWS = 10_000;

const MIME: Record<ExportFormat, string> = {
  [ExportFormat.XLSX]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  [ExportFormat.PDF]: 'application/pdf',
};

const TITLES: Record<ReportType, string> = {
  [ReportType.PAYMENTS]: "To'lovlar hisoboti",
  [ReportType.PATIENTS]: 'Bemorlar hisoboti',
  [ReportType.SERVICES]: 'Xizmatlar hisoboti',
  [ReportType.DOCTORS]: 'Shifokorlar hisoboti',
  [ReportType.QUEUES]: 'Navbatlar hisoboti',
  [ReportType.AUDIT]: 'Audit log',
  [ReportType.LOGIN_HISTORY]: 'Kirish tarixi',
};

const pick = <T extends string>(values: string[] | undefined, allowed: Record<string, T>): T[] | undefined => {
  if (!values?.length) return undefined;
  const valid = Object.values(allowed);
  const bad = values.filter((v) => !valid.includes(v as T));
  if (bad.length) throw new BadRequestException(`Invalid filter value(s): ${bad.join(', ')}`);
  return values as T[];
};

const withLimit = <T extends object>(dto: T, extra: Partial<T>): T => Object.assign(dto, { page: 1, limit: EXPORT_MAX_ROWS }, extra);

export interface ExportFile {
  buffer: Buffer;
  filename: string;
  mime: string;
}

@Injectable()
export class ExportsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly settings: SettingsService,
    private readonly reports: ReportsService,
    private readonly payments: PaymentsService,
    private readonly patients: PatientsService,
    private readonly audit: AuditService,
    private readonly loginHistory: LoginHistoryService,
  ) {}

  async export(type: ReportType, query: ExportQueryDto, userId: string, meta: RequestMeta): Promise<ExportFile> {
    const table = await this.buildTable(type, query);
    const buffer = query.format === ExportFormat.PDF ? await renderPdf(table) : await renderXlsx(table);
    const stamp = new Date().toISOString().slice(0, 10);
    await this.audit.log({
      userId,
      action: AuditAction.EXPORT,
      module: AUDIT_MODULES.REPORTS,
      entity: 'Report',
      entityId: null,
      newValue: { type, format: query.format, dateFrom: query.dateFrom ?? null, dateTo: query.dateTo ?? null, rows: table.rows.length },
      description: `Exported ${type} (${query.format})`,
      meta,
    });
    return { buffer, filename: `${type}-${stamp}.${query.format}`, mime: MIME[query.format] };
  }

  private async buildTable(type: ReportType, q: ExportQueryDto): Promise<ReportTable> {
    const settings = await this.settings.getAll();
    const tz = settings.timezone;
    const period =
      q.dateFrom || q.dateTo
        ? `${q.dateFrom ? formatDate(new Date(`${q.dateFrom.slice(0, 10)}T12:00:00Z`), 'UTC') : '…'} - ${
            q.dateTo ? formatDate(new Date(`${q.dateTo.slice(0, 10)}T12:00:00Z`), 'UTC') : '…'
          }`
        : 'Barcha davr';
    const base = {
      title: TITLES[type],
      period,
      hospitalName: settings.hospitalName,
      generatedAt: formatDateTime(new Date(), tz),
    };
    const dt = (d: Date | null | undefined): string => (d ? formatDateTime(d, tz) : '');

    switch (type) {
      case ReportType.PAYMENTS: {
        const pq = withLimit(new PaymentQueryDto(), {
          dateFrom: q.dateFrom, dateTo: q.dateTo, search: q.search,
          status: pick(q.status, PaymentStatus), method: pick(q.method, PaymentMethod),
          doctorId: q.doctorId, serviceId: q.serviceId, departmentId: q.departmentId, patientId: q.patientId,
        });
        const report = await this.reports.paymentsReport(pq);
        const summary = report.extra?.summary as { total: number; cash: number; card: number; contract: number; refunded: number; debt: number };
        const payments = report.items as Payment[];
        const patientsCount = new Set(payments.map((p) => p.patientId)).size;
        const servicesCount = payments.reduce((acc, p) => acc + p.items.length, 0);
        return {
          ...base,
          summary: [
            { label: 'Jami bemorlar', value: formatMoney(patientsCount) },
            { label: 'Jami xizmatlar', value: formatMoney(servicesCount) },
            { label: "Jami to'lovlar", value: formatMoney(report.meta.total) },
            { label: 'Jami tushum', value: `${formatMoney(summary.total)} UZS` },
            { label: 'Naqd / Karta / Shartnoma', value: `${formatMoney(summary.cash)} / ${formatMoney(summary.card)} / ${formatMoney(summary.contract)} UZS` },
            { label: 'Qaytarilgan / Qarzdorlik', value: `${formatMoney(summary.refunded)} / ${formatMoney(summary.debt)} UZS` },
          ],
          columns: [
            { key: 'receipt', header: 'Chek', width: 16 },
            { key: 'date', header: 'Sana', width: 15 },
            { key: 'patient', header: 'Bemor', width: 24 },
            { key: 'services', header: 'Xizmatlar', width: 34 },
            { key: 'method', header: "To'lov turi", width: 12 },
            { key: 'status', header: 'Holat', width: 14 },
            { key: 'total', header: 'Jami', width: 13, money: true },
            { key: 'paid', header: "To'langan", width: 13, money: true },
            { key: 'remaining', header: 'Qoldiq', width: 12, money: true },
            { key: 'refunded', header: 'Qaytarilgan', width: 12, money: true },
          ],
          rows: payments.map((p) => ({
            receipt: p.receiptNumber,
            date: dt(p.createdAt),
            patient: fullName(p.patient),
            services: p.items.map((i) => i.serviceName).join(', '),
            method: METHOD_LABELS_UZ[p.method],
            status: p.status,
            total: p.totalAmount,
            paid: p.paidAmount,
            remaining: p.remainingAmount,
            refunded: p.refundedAmount,
          })),
        };
      }
      case ReportType.PATIENTS: {
        const pq = withLimit(new PatientQueryDto(), {
          dateFrom: q.dateFrom, dateTo: q.dateTo, search: q.search, gender: q.gender as Gender | undefined,
        });
        const res = await this.patients.findAll(pq);
        return {
          ...base,
          summary: [{ label: 'Jami bemorlar', value: formatMoney(res.meta.total) }],
          columns: [
            { key: 'code', header: 'ID', width: 12 },
            { key: 'name', header: 'F.I.Sh.', width: 30 },
            { key: 'birthDate', header: "Tug'ilgan sana", width: 13 },
            { key: 'gender', header: 'Jinsi', width: 9 },
            { key: 'phone', header: 'Telefon', width: 16 },
            { key: 'passport', header: 'Pasport', width: 14 },
            { key: 'address', header: 'Manzil', width: 28 },
            { key: 'createdAt', header: "Ro'yxatga olingan", width: 15 },
          ],
          rows: res.items.map((p) => ({
            code: p.patientCode,
            name: fullName(p),
            birthDate: p.birthDate ?? '',
            gender: p.gender === Gender.MALE ? 'Erkak' : p.gender === Gender.FEMALE ? 'Ayol' : '',
            phone: p.phone ?? '',
            passport: p.passport ?? '',
            address: p.address ?? '',
            createdAt: dt(p.createdAt),
          })),
        };
      }
      case ReportType.SERVICES: {
        const stats = await this.reports.serviceStats({ dateFrom: q.dateFrom, dateTo: q.dateTo, departmentId: q.departmentId });
        const count = stats.reduce((a, s) => a + s.count, 0);
        const amount = stats.reduce((a, s) => a + s.amount, 0);
        return {
          ...base,
          summary: [
            { label: 'Jami xizmatlar', value: formatMoney(count) },
            { label: 'Jami summa', value: `${formatMoney(amount)} UZS` },
          ],
          columns: [
            { key: 'code', header: 'Kod', width: 12 },
            { key: 'name', header: 'Xizmat', width: 36 },
            { key: 'department', header: "Bo'lim", width: 22 },
            { key: 'count', header: 'Soni', width: 10, align: 'right' },
            { key: 'amount', header: 'Summa', width: 16, money: true },
          ],
          rows: stats.map((s) => ({ code: s.code, name: s.name, department: s.departmentName, count: s.count, amount: s.amount })),
        };
      }
      case ReportType.DOCTORS: {
        const stats = await this.reports.doctorStats({ dateFrom: q.dateFrom, dateTo: q.dateTo, departmentId: q.departmentId });
        return {
          ...base,
          summary: [
            { label: 'Shifokorlar', value: String(stats.length) },
            { label: "Ko'rilgan bemorlar", value: formatMoney(stats.reduce((a, s) => a + s.patientsServed, 0)) },
            { label: 'Jami summa', value: `${formatMoney(stats.reduce((a, s) => a + s.amount, 0))} UZS` },
          ],
          columns: [
            { key: 'name', header: 'Shifokor', width: 28 },
            { key: 'specialty', header: 'Mutaxassislik', width: 20 },
            { key: 'room', header: 'Xona', width: 8 },
            { key: 'services', header: 'Xizmatlar soni', width: 12, align: 'right' },
            { key: 'served', header: "Ko'rilgan bemorlar", width: 14, align: 'right' },
            { key: 'amount', header: 'Summa', width: 16, money: true },
          ],
          rows: stats.map((s) => ({
            name: s.name, specialty: s.specialty, room: s.roomNumber, services: s.servicesCount, served: s.patientsServed, amount: s.amount,
          })),
        };
      }
      case ReportType.QUEUES: {
        const qq = withLimit(new QueueReportQueryDto(), {
          dateFrom: q.dateFrom, dateTo: q.dateTo, doctorId: q.doctorId, departmentId: q.departmentId, status: pick(q.status, QueueStatus),
        });
        const res = await this.reports.queueReport(qq);
        const s = res.extra?.summary as Record<string, number | null>;
        return {
          ...base,
          summary: [
            { label: 'Jami navbatlar', value: formatMoney(res.meta.total) },
            { label: 'Yakunlangan / Kutmoqda / Bekor', value: `${s.COMPLETED} / ${s.WAITING} / ${s.CANCELLED}` },
            { label: "O'rtacha kutish (daq.)", value: s.avgWaitMinutes === null ? '—' : String(s.avgWaitMinutes) },
            { label: "O'rtacha xizmat (daq.)", value: s.avgServiceMinutes === null ? '—' : String(s.avgServiceMinutes) },
          ],
          columns: [
            { key: 'ticket', header: 'Navbat', width: 9 },
            { key: 'date', header: 'Sana', width: 11 },
            { key: 'patient', header: 'Bemor', width: 24 },
            { key: 'doctor', header: 'Shifokor', width: 22 },
            { key: 'department', header: "Bo'lim", width: 16 },
            { key: 'room', header: 'Xona', width: 7 },
            { key: 'status', header: 'Holat', width: 12 },
            { key: 'created', header: 'Yaratildi', width: 14 },
            { key: 'called', header: 'Chaqirildi', width: 14 },
            { key: 'completed', header: 'Yakunlandi', width: 14 },
          ],
          rows: res.items.map((t) => ({
            ticket: t.ticketNumber,
            date: t.queueDate,
            patient: fullName(t.patient),
            doctor: shortDoctorName(t.doctor?.user),
            department: t.department?.name ?? '',
            room: t.roomNumber ?? '',
            status: t.status,
            created: dt(t.createdAt),
            called: dt(t.calledAt),
            completed: dt(t.completedAt),
          })),
        };
      }
      case ReportType.AUDIT: {
        const aq = withLimit(new AuditQueryDto(), {
          dateFrom: q.dateFrom, dateTo: q.dateTo, search: q.search, action: q.action, module: q.module, userId: q.userId,
        });
        const res = await this.audit.findAll(aq);
        return {
          ...base,
          summary: [{ label: 'Yozuvlar', value: formatMoney(res.meta.total) }],
          columns: [
            { key: 'date', header: 'Sana', width: 14 },
            { key: 'user', header: 'Foydalanuvchi', width: 18 },
            { key: 'action', header: 'Amal', width: 13 },
            { key: 'module', header: 'Modul', width: 11 },
            { key: 'entity', header: 'Obyekt', width: 13 },
            { key: 'description', header: 'Tavsif', width: 40 },
            { key: 'ip', header: 'IP', width: 13 },
          ],
          rows: res.items.map((a) => ({
            date: dt(a.createdAt),
            user: a.user ? `${a.user.login} (${a.user.lastName} ${a.user.firstName})` : 'system',
            action: a.action,
            module: a.module,
            entity: a.entity,
            description: a.description ?? '',
            ip: a.ip ?? '',
          })),
        };
      }
      case ReportType.LOGIN_HISTORY: {
        const lq = withLimit(new LoginHistoryQueryDto(), {
          dateFrom: q.dateFrom, dateTo: q.dateTo, search: q.search, userId: q.userId, success: q.success,
        });
        const res = await this.loginHistory.findAll(lq);
        return {
          ...base,
          summary: [
            { label: 'Jami urinishlar', value: formatMoney(res.meta.total) },
            { label: 'Muvaffaqiyatsiz', value: formatMoney(res.items.filter((h) => !h.success).length) },
          ],
          columns: [
            { key: 'date', header: 'Kirish', width: 14 },
            { key: 'logout', header: 'Chiqish', width: 14 },
            { key: 'login', header: 'Login', width: 12 },
            { key: 'user', header: 'Foydalanuvchi', width: 20 },
            { key: 'result', header: 'Natija', width: 18 },
            { key: 'ip', header: 'IP', width: 13 },
            { key: 'browser', header: 'Brauzer', width: 14 },
            { key: 'os', header: 'OS', width: 12 },
            { key: 'device', header: 'Qurilma', width: 9 },
          ],
          rows: res.items.map((h) => ({
            date: dt(h.loginAt),
            logout: dt(h.logoutAt),
            login: h.loginAttempt,
            user: h.user ? `${h.user.lastName} ${h.user.firstName}` : '',
            result: h.success ? 'SUCCESS' : `FAILED (${h.failureReason ?? ''})`,
            ip: h.ip ?? '',
            browser: h.browser ?? '',
            os: h.os ?? '',
            device: h.device ?? '',
          })),
        };
      }
      default:
        throw new BadRequestException(`Unknown report type ${String(type)}`);
    }
  }
}
