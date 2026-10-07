import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestMeta } from '../types/auth.types';

const MAX_UA_LENGTH = 500;

export const extractRequestMeta = (request: Request): RequestMeta => {
  const ua = request.headers['user-agent'];
  return {
    ip: (request.ip ?? request.socket?.remoteAddress ?? null)?.replace(/^::ffff:/, '') ?? null,
    userAgent: typeof ua === 'string' ? ua.slice(0, MAX_UA_LENGTH) : null,
  };
};

/** IP + user agent of the caller (honours `trust proxy` / X-Forwarded-For). */
export const ReqMeta = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestMeta =>
  extractRequestMeta(ctx.switchToHttp().getRequest<Request>()),
);
