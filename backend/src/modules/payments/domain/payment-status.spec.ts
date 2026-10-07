import { PaymentStatus } from '../../../common/constants/enums';
import { computePaymentState, refundableAmount } from './payment-status';

describe('computePaymentState', () => {
  it('is PAID when paid covers the total', () => {
    expect(computePaymentState({ totalAmount: 230000, paidAmount: 230000, refundedAmount: 0 })).toEqual({
      status: PaymentStatus.PAID,
      remainingAmount: 0,
    });
  });

  it('is PARTIALLY_PAID with the correct remainder', () => {
    expect(computePaymentState({ totalAmount: 230000, paidAmount: 100000, refundedAmount: 0 })).toEqual({
      status: PaymentStatus.PARTIALLY_PAID,
      remainingAmount: 130000,
    });
  });

  it('is UNPAID when nothing was paid (e.g. contract billed later)', () => {
    expect(computePaymentState({ totalAmount: 150000, paidAmount: 0, refundedAmount: 0 })).toEqual({
      status: PaymentStatus.UNPAID,
      remainingAmount: 150000,
    });
  });

  it('is REFUNDED when everything paid was returned', () => {
    expect(computePaymentState({ totalAmount: 230000, paidAmount: 230000, refundedAmount: 230000 }).status).toBe(PaymentStatus.REFUNDED);
  });

  it('keeps PAID after a partial refund and does not create debt', () => {
    expect(computePaymentState({ totalAmount: 230000, paidAmount: 230000, refundedAmount: 80000 })).toEqual({
      status: PaymentStatus.PAID,
      remainingAmount: 0,
    });
  });

  it('is CANCELLED regardless of amounts when cancelled', () => {
    expect(computePaymentState({ totalAmount: 1, paidAmount: 0, refundedAmount: 0, cancelled: true }).status).toBe(PaymentStatus.CANCELLED);
  });

  it('handles floating point money safely', () => {
    expect(computePaymentState({ totalAmount: 0.3, paidAmount: 0.1 + 0.2, refundedAmount: 0 }).status).toBe(PaymentStatus.PAID);
  });

  it('computes refundable amount', () => {
    expect(refundableAmount({ totalAmount: 100, paidAmount: 100, refundedAmount: 30 })).toBe(70);
  });
});
