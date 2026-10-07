import { ValueTransformer } from 'typeorm';

/** Postgres `numeric` comes back as string — expose it as a JS number (money in UZS). */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null | undefined => value,
  from: (value: string | null): number | null => (value === null || value === undefined ? null : Number(value)),
};
