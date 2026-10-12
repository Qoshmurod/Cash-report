import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * One row per (day, prefix). Incremented atomically with
 * `INSERT … ON CONFLICT DO UPDATE … RETURNING` which takes a row lock,
 * so concurrent checkouts can never receive the same number.
 */
@Entity('queue_counters')
export class QueueCounter {
  @PrimaryColumn({ type: 'date' })
  queueDate: string;

  @PrimaryColumn({ length: 3 })
  prefix: string;

  @Column({ type: 'int', default: 0 })
  lastNumber: number;
}
