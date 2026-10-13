import { QueueStatus } from '../../../common/constants/enums';

export enum QueueCommand {
  CALL = 'call',
  START = 'start',
  COMPLETE = 'complete',
  SKIP = 'skip',
  REQUEUE = 'requeue',
  CANCEL = 'cancel',
  TRANSFER = 'transfer',
}

interface Transition {
  from: readonly QueueStatus[];
  to: QueueStatus | null; // null = status unchanged
}

const S = QueueStatus;

/** Allowed ticket transitions. Anything else is a 409 CONFLICT. */
export const QUEUE_TRANSITIONS: Record<QueueCommand, Transition> = {
  [QueueCommand.CALL]: { from: [S.WAITING, S.SKIPPED, S.CALLED], to: S.CALLED },
  [QueueCommand.START]: { from: [S.CALLED], to: S.IN_PROGRESS },
  [QueueCommand.COMPLETE]: { from: [S.IN_PROGRESS], to: S.COMPLETED },
  [QueueCommand.SKIP]: { from: [S.WAITING, S.CALLED], to: S.SKIPPED },
  [QueueCommand.REQUEUE]: { from: [S.SKIPPED], to: S.WAITING },
  [QueueCommand.CANCEL]: { from: [S.WAITING, S.CALLED, S.IN_PROGRESS, S.SKIPPED], to: S.CANCELLED },
  [QueueCommand.TRANSFER]: { from: [S.WAITING, S.SKIPPED], to: S.WAITING },
};

export const FINAL_QUEUE_STATUSES: readonly QueueStatus[] = [S.COMPLETED, S.CANCELLED];
export const ACTIVE_QUEUE_STATUSES: readonly QueueStatus[] = [S.CALLED, S.IN_PROGRESS];

export const canTransition = (command: QueueCommand, current: QueueStatus): boolean =>
  QUEUE_TRANSITIONS[command].from.includes(current);

/** Returns the next status or throws a descriptive error for invalid transitions. */
export const nextStatus = (command: QueueCommand, current: QueueStatus): QueueStatus => {
  if (!canTransition(command, current)) {
    throw new InvalidQueueTransitionError(command, current);
  }
  return QUEUE_TRANSITIONS[command].to ?? current;
};

export class InvalidQueueTransitionError extends Error {
  constructor(
    readonly command: QueueCommand,
    readonly current: QueueStatus,
  ) {
    super(`Cannot ${command} a ticket in status ${current}`);
  }
}

export const formatTicketNumber = (prefix: string, sequence: number): string => `${prefix}${sequence}`;
