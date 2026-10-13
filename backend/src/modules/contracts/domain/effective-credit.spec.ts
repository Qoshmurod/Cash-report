import { effectiveCredit } from '../contracts.service';

describe('effectiveCredit (qarz limiti)', () => {
  it('10 mln shartnoma, 7 mln o‘tkazilgan, 3 mln kafolat → 3 mln', () => expect(effectiveCredit(3_000_000, 3_000_000)).toBe(3_000_000));
  it('kafolat to‘lanmagan qismdan katta bo‘lsa, to‘lanmagan qism bilan cheklanadi', () => expect(effectiveCredit(5_000_000, 3_000_000)).toBe(3_000_000));
  it('keyin 2 mln o‘tkazilsa limit 1 mln ga tushadi', () => expect(effectiveCredit(3_000_000, 1_000_000)).toBe(1_000_000));
  it('shartnoma to‘liq to‘langanda qarz yo‘q', () => expect(effectiveCredit(3_000_000, 0)).toBe(0));
  it('shartnoma summasi kiritilmagan bo‘lsa qarz yo‘q', () => expect(effectiveCredit(3_000_000, null)).toBe(0));
});
