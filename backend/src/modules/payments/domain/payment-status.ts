import { PaymentStatus } from '../../../common/constants/enums';
import { roundMoney } from '../../../common/utils/money.util';

export interface PaymentAmounts {
  totalAmount: number;
  paidAmount: number;
  refundedAmount: number;
  cancelled?: boolean;
}

export interface PaymentState {
  status: PaymentStatus;
  remainingAmount: number;
}

/**
 * Single source of truth for payment status math.
 *  - CANCELLED: explicitly cancelled (only allowed while nothing was paid)
 *  - REFUNDED:  everything that was paid has been returned
 *  - PAID:      paid ≥ total (a partial refund keeps PAID; refunds never create debt)
 *  - PARTIALLY_PAID: 0 < paid < total
 *  - UNPAID:    nothing paid yet (e.g. contract billed later)
 */
export const computePaymentState = (a: PaymentAmounts): PaymentState => {
  const total = roundMoney(a.totalAmount);
  const paid = roundMoney(a.paidAmount);
  const refunded = roundMoney(a.refundedAmount);
  if (a.cancelled) return { status: PaymentStatus.CANCELLED, remainingAmount: 0 };
  if (paid > 0 && refunded >= paid) return { status: PaymentStatus.REFUNDED, remainingAmount: 0 };
  const remainingAmount = Math.max(0, roundMoney(total - paid));
  if (paid >= total) return { status: PaymentStatus.PAID, remainingAmount: 0 };
  if (paid > 0) return { status: PaymentStatus.PARTIALLY_PAID, remainingAmount };
  return { status: PaymentStatus.UNPAID, remainingAmount };
};

export const FINAL_PAYMENT_STATUSES: readonly PaymentStatus[] = [PaymentStatus.CANCELLED, PaymentStatus.REFUNDED];

export const refundableAmount = (a: PaymentAmounts): number => Math.max(0, roundMoney(a.paidAmount - a.refundedAmount));
