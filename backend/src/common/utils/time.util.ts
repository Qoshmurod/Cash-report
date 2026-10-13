import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const DEFAULT_TZ = 'Asia/Tashkent';

/** YYYY-MM-DD of `date` in the given timezone. */
export const dateInTz = (tz: string, date: Date = new Date()): string => formatInTimeZone(date, tz, 'yyyy-MM-dd');

/** UTC instant for 00:00 local time of a YYYY-MM-DD day. */
export const startOfDayUtc = (day: string, tz: string): Date => fromZonedTime(`${day}T00:00:00`, tz);

/** UTC instant for the start of the day *after* `day` (exclusive upper bound). */
export const endOfDayUtcExclusive = (day: string, tz: string): Date => {
  const start = startOfDayUtc(day, tz);
  const next = new Date(start.getTime());
  next.setUTCDate(next.getUTCDate() + 1);
  // DST-safe: recompute from the local calendar date of the next day
  return fromZonedTime(`${formatInTimeZone(next, tz, 'yyyy-MM-dd')}T00:00:00`, tz);
};

export interface UtcRange {
  from?: Date;
  to?: Date;
}

/** Converts inclusive local day strings to a half-open UTC range [from, to). */
export const dayRangeToUtc = (tz: string, dateFrom?: string, dateTo?: string): UtcRange => ({
  from: dateFrom ? startOfDayUtc(dateFrom.slice(0, 10), tz) : undefined,
  to: dateTo ? endOfDayUtcExclusive(dateTo.slice(0, 10), tz) : undefined,
});

export const formatDateTime = (date: Date, tz: string): string => formatInTimeZone(date, tz, 'dd.MM.yyyy HH:mm');
export const formatDate = (date: Date, tz: string): string => formatInTimeZone(date, tz, 'dd.MM.yyyy');

/** ISO weekday 1..7 (Mon..Sun) in the timezone. */
export const isoWeekdayInTz = (tz: string, date: Date = new Date()): number => Number(formatInTimeZone(date, tz, 'i'));
export const timeInTz = (tz: string, date: Date = new Date()): string => formatInTimeZone(date, tz, 'HH:mm');
