import { matchGuarantee, normalizeText } from './guarantee-match';

const TEMPLATE = `KAFOLAT XATI № {xat_raqami}
{tashkilot} {shartnoma_raqami}-sonli shartnoma bo'yicha qolgan {summa} so'm qarzni to'lashni kafolatlaydi.
Sana: {sana}`;

const values = {
  shartnoma_raqami: 'SH-2026/101',
  tashkilot: '"Navoiy MMK" AJ',
  summa: '3 000 000',
  shartnoma_summasi: '10 000 000',
  xat_raqami: 'KX-15',
  sana: '13.10.2026',
};

describe('guarantee letter matching', () => {
  it('matches a letter that follows the template (case, quotes, digit grouping ignored)', () => {
    const letter = `Kafolat xati № KX-15
«Navoiy MMK» AJ SH-2026/101-sonli shartnoma boʻyicha qolgan 3000000 soʻm qarzni to‘lashni kafolatlaydi.
Sana: 13.10.2026
Direktor: A. Karimov`;
    const r = matchGuarantee(TEMPLATE, values, letter);
    expect(r.missingLines).toEqual([]);
    expect(r.matched).toBe(true);
    expect(r.similarity).toBeGreaterThan(80);
  });

  it('reports the lines that differ (wrong amount)', () => {
    const letter = `Kafolat xati № KX-15
"Navoiy MMK" AJ SH-2026/101-sonli shartnoma bo'yicha qolgan 5 000 000 so'm qarzni to'lashni kafolatlaydi.
Sana: 13.10.2026`;
    const r = matchGuarantee(TEMPLATE, values, letter);
    expect(r.matched).toBe(false);
    expect(r.missingLines).toHaveLength(1);
    expect(r.missingLines[0]).toContain('3 000 000');
  });

  it('normalizes apostrophes and thousands separators', () => {
    expect(normalizeText("Bo‘yicha 3 000 000 so'm")).toBe(normalizeText('boʻyicha 3000000 soʻm'));
  });
});
