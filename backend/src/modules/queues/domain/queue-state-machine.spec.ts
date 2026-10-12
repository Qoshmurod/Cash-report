import { QueueStatus } from '../../../common/constants/enums';
import { formatTicketNumber, InvalidQueueTransitionError, nextStatus, QueueCommand } from './queue-state-machine';

describe('queue state machine', () => {
  it('follows the happy path WAITING → CALLED → IN_PROGRESS → COMPLETED', () => {
    let s = QueueStatus.WAITING;
    s = nextStatus(QueueCommand.CALL, s);
    expect(s).toBe(QueueStatus.CALLED);
    s = nextStatus(QueueCommand.START, s);
    expect(s).toBe(QueueStatus.IN_PROGRESS);
    s = nextStatus(QueueCommand.COMPLETE, s);
    expect(s).toBe(QueueStatus.COMPLETED);
  });

  it('allows re-calling a CALLED ticket', () => {
    expect(nextStatus(QueueCommand.CALL, QueueStatus.CALLED)).toBe(QueueStatus.CALLED);
  });

  it('supports no-show: skip then requeue then call again', () => {
    expect(nextStatus(QueueCommand.SKIP, QueueStatus.CALLED)).toBe(QueueStatus.SKIPPED);
    expect(nextStatus(QueueCommand.REQUEUE, QueueStatus.SKIPPED)).toBe(QueueStatus.WAITING);
    expect(nextStatus(QueueCommand.CALL, QueueStatus.SKIPPED)).toBe(QueueStatus.CALLED);
  });

  it.each([
    [QueueCommand.START, QueueStatus.WAITING],
    [QueueCommand.COMPLETE, QueueStatus.CALLED],
    [QueueCommand.CALL, QueueStatus.COMPLETED],
    [QueueCommand.CANCEL, QueueStatus.COMPLETED],
    [QueueCommand.CALL, QueueStatus.CANCELLED],
    [QueueCommand.SKIP, QueueStatus.IN_PROGRESS],
    [QueueCommand.TRANSFER, QueueStatus.IN_PROGRESS],
  ])('rejects %s from %s', (command, status) => {
    expect(() => nextStatus(command, status)).toThrow(InvalidQueueTransitionError);
  });

  it('formats ticket numbers', () => {
    expect(formatTicketNumber('A', 19)).toBe('A19');
  });
});
