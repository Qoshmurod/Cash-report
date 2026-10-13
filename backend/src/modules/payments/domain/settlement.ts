import { PaymentMethod, SettlementStatus } from '../../../common/constants/enums';

/** Method cash is re-booked as when the day is closed. */
export const DAY_CLOSING_TARGET_METHOD = PaymentMethod.CARD;

/** Methods whose money stays "to'lov jarayonda" (PENDING) until the day is closed. */
export const PENDING_METHODS: readonly PaymentMethod[] = [PaymentMethod.CASH];

export const settlementForMethod = (method: PaymentMethod): SettlementStatus =>
  PENDING_METHODS.includes(method) ? SettlementStatus.PENDING : SettlementStatus.SETTLED;
