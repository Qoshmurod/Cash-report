import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { formatTicketNumber } from './domain/queue-state-machine';

export interface AllocatedNumber {
  prefix: string;
  sequence: number;
  ticketNumber: string;
}

/**
 * Allocates the next ticket number for (day, prefix).
 * The upsert takes a row-level lock on the counter row until the surrounding
 * transaction commits, so concurrent checkouts are serialized per prefix and
 * can never obtain the same number. The UNIQUE(queue_date, ticket_number)
 * constraint on queue_tickets is the last line of defence.
 */
@Injectable()
export class QueueNumberService {
  async next(manager: EntityManager, queueDate: string, prefix: string): Promise<AllocatedNumber> {
    const rows: { last_number: number }[] = await manager.query(
      `INSERT INTO queue_counters (queue_date, prefix, last_number)
       VALUES ($1, $2, 1)
       ON CONFLICT (queue_date, prefix)
       DO UPDATE SET last_number = queue_counters.last_number + 1
       RETURNING last_number`,
      [queueDate, prefix],
    );
    const sequence = Number(rows[0].last_number);
    return { prefix, sequence, ticketNumber: formatTicketNumber(prefix, sequence) };
  }
}
