/**
 * Kafolat xatini namuna bilan solishtirish.
 * The template is filled with the contract / letter values, then every non-empty template line
 * must appear in the entered letter (case, punctuation, apostrophe variants and digit grouping are
 * ignored). Word similarity (0–100) is reported for the approver.
 */
export interface GuaranteeValues {
  shartnoma_raqami: string;
  tashkilot: string;
  summa: string;
  shartnoma_summasi: string;
  xat_raqami: string;
  sana: string;
}

export const PLACEHOLDERS: (keyof GuaranteeValues)[] = ['shartnoma_raqami', 'tashkilot', 'summa', 'shartnoma_summasi', 'xat_raqami', 'sana'];

export interface GuaranteeMatch {
  matched: boolean;
  similarity: number;
  missingLines: string[];
  filledTemplate: string;
}

export const fillTemplate = (template: string, values: GuaranteeValues): string =>
  template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? values[key as keyof GuaranteeValues] : m));

export const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[ʻʼ‘’`´']/g, "'")
    .replace(/(\d)[\s .,](?=\d{3}\b)/g, '$1')
    .replace(/[«»"“”„.,;:!?()\[\]–—\-_/\\*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const words = (text: string): string[] => normalizeText(text).split(' ').filter(Boolean);

/** Dice coefficient over the longest common word subsequence. */
const similarity = (a: string[], b: string[]): number => {
  if (!a.length && !b.length) return 100;
  if (!a.length || !b.length) return 0;
  const x = a.slice(0, 3000);
  const y = b.slice(0, 3000);
  let prev = new Array<number>(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    const cur = new Array<number>(y.length + 1).fill(0);
    for (let j = 1; j <= y.length; j++) cur[j] = x[i - 1] === y[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return Math.round((200 * prev[y.length]) / (x.length + y.length));
};

export const matchGuarantee = (template: string, values: GuaranteeValues, letter: string): GuaranteeMatch => {
  const filledTemplate = fillTemplate(template, values);
  const body = ` ${normalizeText(letter)} `;
  const missingLines = filledTemplate
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => normalizeText(l).length >= 3)
    .filter((l) => !body.includes(` ${normalizeText(l)} `) && !body.includes(normalizeText(l)));
  return {
    matched: missingLines.length === 0,
    similarity: similarity(words(filledTemplate), words(letter)),
    missingLines,
    filledTemplate,
  };
};
