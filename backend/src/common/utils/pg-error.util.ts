import { QueryFailedError } from 'typeorm';
import { PG_UNIQUE_VIOLATION } from '../constants/app.constants';

export const isUniqueViolation = (error: unknown, constraint?: string): boolean => {
  if (!(error instanceof QueryFailedError)) return false;
  const driver = (error as QueryFailedError & { driverError?: { code?: string; constraint?: string } }).driverError;
  if (driver?.code !== PG_UNIQUE_VIOLATION) return false;
  return constraint ? driver.constraint === constraint : true;
};
