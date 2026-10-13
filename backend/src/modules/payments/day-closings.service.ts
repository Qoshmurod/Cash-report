import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditAction, PaymentMethod, SettlementStatus } from '../../common/constants/enums';
import { DateRangeQueryDto } from '../../common/dto/date-range-query.dto';
import { paginated, Paginated } from '../../common/dto/paginated';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { roundMoney } from '../../common/utils/money.util';
import { dateInTz, dayRangeToUtc } from '../../common/utils/time.util';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { DAY_CLOSING_TARGET_METHOD } from './domain/settlement';
import { DayClosing } from './entities/day-closing.entity';

/** Advisory lock key so two "Kunni yopish" clicks can never settle the same cash twice. */
const DAY_CLOSING_LOCK = 'day_closing';

export interface DayClosingPreview {
  /** Business day (clinic time zone). */
  date: string;
  /** Net pending cash (payments − refunds). */
  amount: number;
  paidAmount: number;
  refundedAmount: number;
  transactionsCount: number;
  paymentsCount: number;
  /** Oldest pending transaction — shows if an earlier day was left unclosed. */
  oldestAt: string | null;
}

@Injectable()
export class DayClosingsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  /** What "Kunni yopish" would settle right now. */
  async preview(): Promise<DayClosingPreview> {
    const tz = await this.settings.getTimezone();
    const [row]: { paid: string; refunded: string; tx_count: string; payments_count: string; oldest: Date | null }[] =
      await this.dataSource.query(
        `SELECT COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'PAYMENT'), 0) AS paid,
                COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'REFUND'), 0) AS refunded,
                COUNT(*) AS tx_count,
                COUNT(DISTINCT t.payment_id) AS payments_count,
                MIN(t.created_at) AS oldest
         FROM payment_transactions t
         WHERE t.settlement_status = $1`,
        [SettlementStatus.PENDING],
      );
    const paidAmount = roundMoney(Number(row.paid));
    const refundedAmount = roundMoney(Number(row.refunded));
    return {
      date: dateInTz(tz),
      amount: roundMoney(paidAmount - refundedAmount),
      paidAmount,
      refundedAmount,
      transactionsCount: Number(row.tx_count),
      paymentsCount: Number(row.payments_count),
      oldestAt: row.oldest ? new Date(row.oldest).toISOString() : null,
    };
  }

  /**
   * Kunni yopish: every PENDING cash transaction is settled and re-booked as CARD
   * (the original method is kept in `original_method`), and its payment leaves
   * "to'lov jarayonda". Reports are built from transactions, so after closing the
   * whole day shows up under "Karta".
   */
  async close(note: string | undefined, user: AuthUser, meta: RequestMeta): Promise<DayClosing> {
    const tz = await this.settings.getTimezone();
    const closingDate = dateInTz(tz);

    const { closingId, paymentIds } = await this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [DAY_CLOSING_LOCK]);

      const repo = manager.getRepository(DayClosing);
      const closing = await repo.save(repo.create({ closingDate, note: note?.trim() || null, closedById: user.id }));

      // One statement → one snapshot: transactions and their payments are settled consistently
      // even while new checkouts are committed concurrently (those simply wait for the next closing).
      const rows: { kind: 'tx' | 'pay'; payment_id: string; type: string | null; amount: string | null }[] = await manager.query(
        `WITH tx AS (
           UPDATE payment_transactions
              SET original_method = method,
                  method = CASE WHEN method = $2::payment_method THEN $3::payment_method ELSE method END,
                  settlement_status = $4::settlement_status,
                  day_closing_id = $1
            WHERE settlement_status = $5::settlement_status
        RETURNING payment_id, type, amount
         ), pay AS (
           UPDATE payments p
              SET original_method = CASE WHEN p.method = $2::payment_method THEN p.method ELSE p.original_method END,
                  method = CASE WHEN p.method = $2::payment_method THEN $3::payment_method ELSE p.method END,
                  settlement_status = $4::settlement_status,
                  settled_at = now(),
                  day_closing_id = $1,
                  updated_at = now()
            WHERE p.id IN (SELECT payment_id FROM tx)
        RETURNING p.id AS payment_id
         )
         SELECT 'tx' AS kind, payment_id, type::text AS type, amount::text AS amount FROM tx
         UNION ALL
         SELECT 'pay' AS kind, payment_id, NULL, NULL FROM pay`,
        [closing.id, PaymentMethod.CASH, DAY_CLOSING_TARGET_METHOD, SettlementStatus.SETTLED, SettlementStatus.PENDING],
      );

      // A cash top-up committed while we were closing keeps its payment "jarayonda" for the next closing.
      await manager.query(
        `UPDATE payments p SET settlement_status = $1::settlement_status, updated_at = now()
          WHERE p.settlement_status <> $1::settlement_status
            AND EXISTS (SELECT 1 FROM payment_transactions t WHERE t.payment_id = p.id AND t.settlement_status = $1::settlement_status)`,
        [SettlementStatus.PENDING],
      );
      // Payments marked PENDING without any pending money left (e.g. data fixed by hand) are released too.
      await manager.query(
        `UPDATE payments p SET settlement_status = $1::settlement_status, settled_at = now(), updated_at = now()
          WHERE p.settlement_status = $2::settlement_status
            AND NOT EXISTS (SELECT 1 FROM payment_transactions t WHERE t.payment_id = p.id AND t.settlement_status = $2::settlement_status)`,
        [SettlementStatus.SETTLED, SettlementStatus.PENDING],
      );

      const txRows = rows.filter((r) => r.kind === 'tx');
      if (!txRows.length) throw new ConflictException("Yopiladigan naqd to'lovlar yo'q (no pending cash to close)");

      const paid = roundMoney(txRows.filter((r) => r.type === 'PAYMENT').reduce((s, r) => s + Number(r.amount), 0));
      const refunded = roundMoney(txRows.filter((r) => r.type === 'REFUND').reduce((s, r) => s + Number(r.amount), 0));
      const ids = [...new Set(txRows.map((r) => r.payment_id))];
      closing.amount = roundMoney(paid - refunded);
      closing.refundedAmount = refunded;
      closing.transactionsCount = txRows.length;
      closing.paymentsCount = ids.length;
      await repo.update(closing.id, {
        amount: closing.amount,
        refundedAmount: closing.refundedAmount,
        transactionsCount: closing.transactionsCount,
        paymentsCount: closing.paymentsCount,
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.UPDATE,
          module: AUDIT_MODULES.PAYMENTS,
          entity: 'DayClosing',
          entityId: closing.id,
          newValue: {
            closingDate,
            amount: closing.amount,
            refundedAmount: refunded,
            transactionsCount: closing.transactionsCount,
            paymentsCount: closing.paymentsCount,
            from: PaymentMethod.CASH,
            to: DAY_CLOSING_TARGET_METHOD,
            note: closing.note,
          },
          description: `Day closed ${closingDate}: ${closing.amount} UZS cash settled as ${DAY_CLOSING_TARGET_METHOD} (${ids.length} payments)`,
          meta,
        },
        manager,
      );
      return { closingId: closing.id, paymentIds: ids };
    });

    // One bulk event — clients just refresh their lists.
    if (paymentIds.length) this.realtime.paymentUpdated({ id: closingId, dayClosed: true });
    return this.findOne(closingId);
  }

  async findAll(query: DateRangeQueryDto): Promise<Paginated<DayClosing>> {
    const tz = await this.settings.getTimezone();
    const qb = this.dataSource
      .getRepository(DayClosing)
      .createQueryBuilder('dc')
      .leftJoin('dc.closedBy', 'u')
      .addSelect(['u.id', 'u.firstName', 'u.lastName']);
    const range = dayRangeToUtc(tz, query.dateFrom, query.dateTo);
    if (range.from) qb.andWhere('dc.closedAt >= :from', { from: range.from });
    if (range.to) qb.andWhere('dc.closedAt < :to', { to: range.to });
    qb.orderBy('dc.closedAt', query.sortOrder).skip(query.skip).take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return paginated(items, total, query.page, query.limit);
  }

  findOne(id: string): Promise<DayClosing> {
    return this.dataSource
      .getRepository(DayClosing)
      .createQueryBuilder('dc')
      .leftJoin('dc.closedBy', 'u')
      .addSelect(['u.id', 'u.firstName', 'u.lastName'])
      .where('dc.id = :id', { id })
      .getOneOrFail();
  }
}
