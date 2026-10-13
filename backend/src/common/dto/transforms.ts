import { Transform } from 'class-transformer';

/** "true"/"false"/"1"/"0" query strings → boolean. */
export const ToBoolean = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return value;
  });

/** "A,B" or ["A","B"] → string[] */
export const ToArray = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return value.flatMap((v) => String(v).split(',')).filter(Boolean);
    return String(value).split(',').map((v) => v.trim()).filter(Boolean);
  });

export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Empty strings become null (optional nullable text fields). */
export const EmptyToNull = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });
