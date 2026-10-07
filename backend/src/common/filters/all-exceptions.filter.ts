import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ERROR_CODES, ErrorCode, PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION } from '../constants/app.constants';

interface ErrorBody {
  success: false;
  error: {
    statusCode: number;
    code: ErrorCode | string;
    message: string;
    details?: unknown;
    path: string;
    timestamp: string;
  };
}

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: ERROR_CODES.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ERROR_CODES.PAYLOAD_TOO_LARGE,
  [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.TOO_MANY_REQUESTS,
};

interface PgDriverError {
  code?: string;
  detail?: string;
  constraint?: string;
}

/** Produces the uniform `{ success:false, error:{…} }` shape for every failure. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    if (response.headersSent) return;

    const { status, code, message, details } = this.normalize(exception);
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} → ${status}`, exception instanceof Error ? exception.stack : String(exception));
    }

    const body: ErrorBody = {
      success: false,
      error: { statusCode: status, code, message, path: request.url, timestamp: new Date().toISOString() },
    };
    if (details !== undefined) body.error.details = details;
    response.status(status).json(body);
  }

  private normalize(exception: unknown): { status: number; code: string; message: string; details?: unknown } {
    if (exception instanceof ThrottlerException) {
      return { status: HttpStatus.TOO_MANY_REQUESTS, code: ERROR_CODES.TOO_MANY_REQUESTS, message: 'Too many requests, please slow down' };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      let code: string = STATUS_TO_CODE[status] ?? (status >= 500 ? ERROR_CODES.INTERNAL_ERROR : ERROR_CODES.BAD_REQUEST);
      let message = exception.message;
      let details: unknown;
      if (typeof res === 'object' && res !== null) {
        const r = res as { message?: unknown; code?: unknown; details?: unknown };
        if (Array.isArray(r.message)) {
          code = ERROR_CODES.VALIDATION_ERROR;
          details = r.message;
          message = 'Validation failed';
        } else if (typeof r.message === 'string') {
          message = r.message;
        }
        if (typeof r.code === 'string') code = r.code;
        if (r.details !== undefined) details = r.details;
      } else if (typeof res === 'string') {
        message = res;
      }
      // body-parser "entity too large"
      if (status === HttpStatus.PAYLOAD_TOO_LARGE) code = ERROR_CODES.PAYLOAD_TOO_LARGE;
      return { status, code, message, details };
    }
    if (exception instanceof QueryFailedError) {
      const driver = (exception as QueryFailedError & { driverError?: PgDriverError }).driverError ?? {};
      if (driver.code === PG_UNIQUE_VIOLATION) {
        return {
          status: HttpStatus.CONFLICT,
          code: ERROR_CODES.CONFLICT,
          message: 'A record with the same unique value already exists',
          details: driver.constraint ? { constraint: driver.constraint } : undefined,
        };
      }
      if (driver.code === PG_FOREIGN_KEY_VIOLATION) {
        return { status: HttpStatus.CONFLICT, code: ERROR_CODES.CONFLICT, message: 'Related record constraint violated' };
      }
    }
    const typed = exception as { type?: string; status?: number };
    if (typed?.type === 'entity.too.large') {
      return { status: HttpStatus.PAYLOAD_TOO_LARGE, code: ERROR_CODES.PAYLOAD_TOO_LARGE, message: 'Request body is too large' };
    }
    if (typed?.type === 'entity.parse.failed') {
      return { status: HttpStatus.BAD_REQUEST, code: ERROR_CODES.BAD_REQUEST, message: 'Malformed JSON body' };
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: ERROR_CODES.INTERNAL_ERROR, message: 'Internal server error' };
  }
}
