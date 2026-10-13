/** Money is kept in whole/decimal UZS; round to 2 decimals to avoid float drift. */
export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export const sumMoney = (values: number[]): number => roundMoney(values.reduce((acc, v) => acc + v, 0));

export const formatMoney = (value: number): string =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value).replace(/ /g, ' ');
