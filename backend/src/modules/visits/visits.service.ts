import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { VisitStatus } from '../../common/constants/enums';
import { QueueTicket } from '../queues/entities/queue-ticket.entity';
import { Visit } from './entities/visit.entity';

export interface VisitNotes {
  complaint?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
}

/** A Visit is the clinical encounter behind an IN_PROGRESS → COMPLETED ticket. */
@Injectable()
export class VisitsService {
  async start(manager: EntityManager, ticket: QueueTicket, doctorId: string): Promise<Visit> {
    const repo = manager.getRepository(Visit);
    const existing = await repo.findOne({ where: { queueTicketId: ticket.id } });
    if (existing) {
      existing.status = VisitStatus.IN_PROGRESS;
      existing.startedAt = new Date();
      existing.endedAt = null;
      return repo.save(existing);
    }
    return repo.save(
      repo.create({ queueTicketId: ticket.id, patientId: ticket.patientId, doctorId, status: VisitStatus.IN_PROGRESS, startedAt: new Date() }),
    );
  }

  async complete(manager: EntityManager, ticketId: string, notes: VisitNotes): Promise<void> {
    await manager.getRepository(Visit).update(
      { queueTicketId: ticketId },
      {
        status: VisitStatus.COMPLETED,
        endedAt: new Date(),
        complaint: notes.complaint ?? null,
        diagnosis: notes.diagnosis ?? null,
        notes: notes.notes ?? null,
      },
    );
  }

  async cancel(manager: EntityManager, ticketId: string): Promise<void> {
    await manager.getRepository(Visit).update({ queueTicketId: ticketId, status: VisitStatus.IN_PROGRESS }, { status: VisitStatus.CANCELLED, endedAt: new Date() });
  }
}
