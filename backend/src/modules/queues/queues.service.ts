import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { QUEUE_BOARD_LIMITS } from '../../common/constants/app.constants';
import { AuditAction, QueueStatus, Role, UserStatus } from '../../common/constants/enums';
import { paginated, Paginated } from '../../common/dto/paginated';
import { escapeLike, resolveSort } from '../../common/dto/pagination-query.dto';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { shortDoctorName } from '../../common/utils/person.util';
import { dateInTz } from '../../common/utils/time.util';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService } from '../audit/audit.service';
import { DoctorService } from '../doctors/entities/doctor-service.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { VisitNotes, VisitsService } from '../visits/visits.service';
import { InvalidQueueTransitionError, nextStatus, QueueCommand } from './domain/queue-state-machine';
import { BoardQueryDto, QueueQueryDto } from './dto/queue.dto';
import { QueueTicket } from './entities/queue-ticket.entity';
import { presentTicket, ticketQuery } from './queue.presenter';

const SORTS = { createdAt: 't.createdAt', sequence: 't.sequence', calledAt: 't.calledAt' };

export interface QueueBoard {
  current: {
    ticketNumber: string;
    roomNumber: string | null;
    departmentName: string;
    doctorName: string;
    calledAt: string;
    status: 'CALLED' | 'IN_PROGRESS';
  }[];
  waiting: { ticketNumber: string; departmentName: string; roomNumber: string | null }[];
  settings: { hospitalName: string; voiceAnnouncements: boolean; announcementLanguage: 'uz' | 'ru' };
  serverTime: string;
}

interface TransitionOptions {
  reason?: string;
  notes?: VisitNotes;
  targetDoctorId?: string;
}

@Injectable()
export class QueuesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly visits: VisitsService,
    private readonly realtime: RealtimeService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  async today(): Promise<string> {
    return dateInTz(await this.settings.getTimezone());
  }

  async findAll(query: QueueQueryDto): Promise<Paginated<QueueTicket>> {
    const date = query.date?.slice(0, 10) ?? (await this.today());
    const idsQb = this.dataSource
      .getRepository(QueueTicket)
      .createQueryBuilder('t')
      .leftJoin('t.patient', 'p')
      .select('t.id', 'id')
      .where('t.queueDate = :date', { date });
    if (query.status?.length) idsQb.andWhere('t.status IN (:...status)', { status: query.status });
    if (query.doctorId) idsQb.andWhere('t.doctorId = :doctorId', { doctorId: query.doctorId });
    if (query.departmentId) idsQb.andWhere('t.departmentId = :departmentId', { departmentId: query.departmentId });
    if (query.search) {
      idsQb.andWhere(
        "(t.ticketNumber ILIKE :s ESCAPE '\\' OR p.firstName ILIKE :s ESCAPE '\\' OR p.lastName ILIKE :s ESCAPE '\\' OR p.phone ILIKE :s ESCAPE '\\' OR p.patientCode ILIKE :s ESCAPE '\\')",
        { s: `%${escapeLike(query.search)}%` },
      );
    }
    const sort = resolveSort(query.sortBy, SORTS);
    idsQb.orderBy(sort, query.sortOrder).addOrderBy('t.id');
    const total = await idsQb.getCount();
    const ids = (await idsQb.offset(query.skip).limit(query.limit).getRawMany<{ id: string }>()).map((r) => r.id);
    if (!ids.length) return paginated([], total, query.page, query.limit);
    const rows = await ticketQuery(this.dataSource.manager).where('t.id IN (:...ids)', { ids }).getMany();
    const byId = new Map(rows.map((t) => [t.id, presentTicket(t)]));
    return paginated(ids.map((id) => byId.get(id)).filter((t): t is QueueTicket => Boolean(t)), total, query.page, query.limit);
  }

  /** Doctor's own tickets: active first, then waiting by sequence, then the rest. */
  async my(user: AuthUser, date?: string): Promise<QueueTicket[]> {
    if (!user.doctorId) throw new ForbiddenException('No doctor profile');
    const day = date?.slice(0, 10) ?? (await this.today());
    const rows = await ticketQuery(this.dataSource.manager)
      .where('t.doctorId = :doctorId AND t.queueDate = :day', { doctorId: user.doctorId, day })
      .orderBy(
        `CASE t.status WHEN 'IN_PROGRESS' THEN 0 WHEN 'CALLED' THEN 1 WHEN 'WAITING' THEN 2 WHEN 'SKIPPED' THEN 3 WHEN 'COMPLETED' THEN 4 ELSE 5 END`,
        'ASC',
      )
      .addOrderBy('t.createdAt', 'ASC')
      .getMany();
    return rows.map(presentTicket);
  }

  async board(query: BoardQueryDto): Promise<QueueBoard> {
    const settings = await this.settings.getAll();
    const day = dateInTz(settings.timezone);
    const base = () => {
      const qb = this.dataSource
        .getRepository(QueueTicket)
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.department', 'dep')
        .leftJoinAndSelect('t.doctor', 'doc')
        .leftJoin('doc.user', 'du')
        .addSelect(['du.id', 'du.firstName', 'du.lastName'])
        .where('t.queueDate = :day', { day });
      if (query.departmentId) qb.andWhere('t.departmentId = :dep', { dep: query.departmentId });
      return qb;
    };
    const [current, waiting] = await Promise.all([
      base()
        .andWhere('t.status IN (:...st)', { st: [QueueStatus.CALLED, QueueStatus.IN_PROGRESS] })
        .orderBy('t.calledAt', 'DESC', 'NULLS LAST')
        .take(QUEUE_BOARD_LIMITS.CURRENT)
        .getMany(),
      base()
        .andWhere('t.status = :w', { w: QueueStatus.WAITING })
        .orderBy('t.createdAt', 'ASC')
        .take(QUEUE_BOARD_LIMITS.WAITING)
        .getMany(),
    ]);
    return {
      current: current.map((t) => ({
        ticketNumber: t.ticketNumber,
        roomNumber: t.roomNumber,
        departmentName: t.department?.name ?? '',
        doctorName: shortDoctorName(t.doctor?.user),
        calledAt: (t.calledAt ?? t.updatedAt).toISOString(),
        status: t.status as 'CALLED' | 'IN_PROGRESS',
      })),
      waiting: waiting.map((t) => ({
        ticketNumber: t.ticketNumber,
        departmentName: t.department?.name ?? '',
        roomNumber: t.doctor?.roomNumber ?? t.roomNumber,
      })),
      settings: {
        hospitalName: settings.hospitalName,
        voiceAnnouncements: settings.voiceAnnouncements,
        announcementLanguage: settings.announcementLanguage,
      },
      serverTime: new Date().toISOString(),
    };
  }

  async findOne(id: string, user: AuthUser): Promise<QueueTicket> {
    const ticket = await ticketQuery(this.dataSource.manager).where('t.id = :id', { id }).getOne();
    if (!ticket) throw new NotFoundException('Queue ticket not found');
    if (user.role === Role.DOCTOR && ticket.doctorId !== user.doctorId) throw new ForbiddenException('Not your patient');
    return presentTicket(ticket);
  }

  call(id: string, user: AuthUser, meta: RequestMeta) {
    return this.transition(id, QueueCommand.CALL, user, meta);
  }
  start(id: string, user: AuthUser, meta: RequestMeta) {
    return this.transition(id, QueueCommand.START, user, meta);
  }
  complete(id: string, user: AuthUser, meta: RequestMeta, notes: VisitNotes) {
    return this.transition(id, QueueCommand.COMPLETE, user, meta, { notes });
  }
  skip(id: string, user: AuthUser, meta: RequestMeta) {
    return this.transition(id, QueueCommand.SKIP, user, meta);
  }
  requeue(id: string, user: AuthUser, meta: RequestMeta) {
    return this.transition(id, QueueCommand.REQUEUE, user, meta);
  }
  cancel(id: string, user: AuthUser, meta: RequestMeta, reason?: string) {
    return this.transition(id, QueueCommand.CANCEL, user, meta, { reason });
  }
  transfer(id: string, user: AuthUser, meta: RequestMeta, targetDoctorId: string) {
    return this.transition(id, QueueCommand.TRANSFER, user, meta, { targetDoctorId });
  }

  /** Cancels open tickets of a payment (used by payment cancel / full refund) inside the caller's transaction. */
  async cancelTicketsOfPayment(
    manager: EntityManager,
    paymentId: string,
    statuses: QueueStatus[],
    reason: string,
  ): Promise<QueueTicket[]> {
    const tickets = await manager
      .getRepository(QueueTicket)
      .createQueryBuilder('t')
      .setLock('pessimistic_write')
      .where('t.paymentId = :paymentId AND t.status IN (:...statuses)', { paymentId, statuses })
      .getMany();
    for (const t of tickets) {
      if (t.status === QueueStatus.IN_PROGRESS) await this.visits.cancel(manager, t.id);
      t.status = QueueStatus.CANCELLED;
      t.cancelReason = reason;
      await manager.getRepository(QueueTicket).update(t.id, { status: QueueStatus.CANCELLED, cancelReason: reason });
    }
    return tickets;
  }

  emitUpdated(tickets: QueueTicket[]): void {
    for (const t of tickets) {
      this.realtime.queueUpdated({
        ticketId: t.id,
        ticketNumber: t.ticketNumber,
        status: t.status,
        doctorId: t.doctorId,
        departmentId: t.departmentId,
      });
    }
  }

  private async transition(
    id: string,
    command: QueueCommand,
    user: AuthUser,
    meta: RequestMeta,
    options: TransitionOptions = {},
  ): Promise<QueueTicket> {
    const previousDoctorId = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(QueueTicket);
      const ticket = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!ticket) throw new NotFoundException('Queue ticket not found');
      if (user.role === Role.DOCTOR && (!user.doctorId || ticket.doctorId !== user.doctorId)) {
        throw new ForbiddenException('You can only manage your own queue');
      }
      let status: QueueStatus;
      try {
        status = nextStatus(command, ticket.status);
      } catch (error) {
        if (error instanceof InvalidQueueTransitionError) throw new ConflictException(error.message);
        throw error;
      }
      const before = { status: ticket.status, doctorId: ticket.doctorId, roomNumber: ticket.roomNumber };
      const oldDoctorId = ticket.doctorId;
      const now = new Date();
      ticket.status = status;

      switch (command) {
        case QueueCommand.CALL: {
          const doctor = ticket.doctorId ? await manager.getRepository(Doctor).findOne({ where: { id: ticket.doctorId } }) : null;
          ticket.roomNumber = doctor?.roomNumber ?? ticket.roomNumber;
          ticket.calledAt = now;
          ticket.calledCount += 1;
          ticket.calledById = user.id;
          break;
        }
        case QueueCommand.START: {
          if (!ticket.doctorId) throw new BadRequestException('Ticket has no doctor assigned');
          const busy = await repo
            .createQueryBuilder('t')
            .where('t.doctorId = :d AND t.status = :s AND t.id <> :id', { d: ticket.doctorId, s: QueueStatus.IN_PROGRESS, id })
            .getExists();
          if (busy) throw new ConflictException('Finish the current patient before starting the next one');
          ticket.startedAt = now;
          await this.visits.start(manager, ticket, ticket.doctorId);
          break;
        }
        case QueueCommand.COMPLETE:
          ticket.completedAt = now;
          await this.visits.complete(manager, ticket.id, options.notes ?? {});
          break;
        case QueueCommand.CANCEL:
          ticket.cancelReason = options.reason ?? null;
          if (before.status === QueueStatus.IN_PROGRESS) await this.visits.cancel(manager, ticket.id);
          break;
        case QueueCommand.TRANSFER:
          await this.assertCanTransfer(manager, ticket, options.targetDoctorId!);
          break;
        default:
          break;
      }

      await repo.save(ticket);
      await this.audit.log(
        {
          userId: user.id,
          action: command === QueueCommand.CALL ? AuditAction.QUEUE_CALL : AuditAction.QUEUE_STATUS,
          module: AUDIT_MODULES.QUEUES,
          entity: 'QueueTicket',
          entityId: ticket.id,
          oldValue: before,
          newValue: { status: ticket.status, doctorId: ticket.doctorId, roomNumber: ticket.roomNumber, reason: options.reason ?? undefined },
          description: `Ticket ${ticket.ticketNumber}: ${command}`,
          meta,
        },
        manager,
      );
      return oldDoctorId;
    });

    const fresh = await this.findOne(id, { ...user, role: Role.ADMIN });
    this.emitUpdated([fresh]);
    if (previousDoctorId && previousDoctorId !== fresh.doctorId) {
      this.realtime.queueUpdated({
        ticketId: fresh.id,
        ticketNumber: fresh.ticketNumber,
        status: fresh.status,
        doctorId: previousDoctorId,
        departmentId: fresh.departmentId,
      });
    }
    if (command === QueueCommand.CALL) {
      this.realtime.queueCalled({
        ticketId: fresh.id,
        ticketNumber: fresh.ticketNumber,
        roomNumber: fresh.roomNumber,
        doctorName: shortDoctorName(fresh.doctor?.user),
        departmentName: fresh.department?.name ?? '',
        calledAt: (fresh.calledAt ?? new Date()).toISOString(),
        calledCount: fresh.calledCount,
        doctorId: fresh.doctorId,
      });
    }
    return fresh;
  }

  private async assertCanTransfer(manager: EntityManager, ticket: QueueTicket, doctorId: string): Promise<void> {
    const doctor = await manager.getRepository(Doctor).findOne({ where: { id: doctorId }, relations: { user: true } });
    if (!doctor || doctor.user?.status !== UserStatus.ACTIVE) throw new BadRequestException('Target doctor is not active');
    if (!doctor.isAvailable) throw new BadRequestException('Target doctor is not accepting patients');
    const serviceIds = (
      await manager.query<{ service_id: string }[]>('SELECT service_id FROM queue_ticket_services WHERE ticket_id = $1', [ticket.id])
    ).map((r) => r.service_id);
    if (serviceIds.length) {
      const provided = await manager
        .getRepository(DoctorService)
        .createQueryBuilder('ds')
        .where('ds.doctorId = :doctorId AND ds.serviceId IN (:...serviceIds)', { doctorId, serviceIds })
        .getCount();
      if (provided !== serviceIds.length) throw new BadRequestException('Target doctor does not provide all services of this ticket');
    }
    ticket.doctorId = doctorId;
    ticket.roomNumber = doctor.roomNumber;
    delete ticket.doctor;
  }
}
