import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Paginated, isPaginated } from '../dto/paginated';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: Paginated<unknown>['meta'];
}

/** Wraps every JSON response into `{ success, data, meta? }`. Files (StreamableFile) pass through. */
@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiEnvelope<unknown> | StreamableFile> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<unknown> | StreamableFile> {
    return next.handle().pipe(
      map((body) => {
        if (body instanceof StreamableFile) return body;
        if (isPaginated(body)) {
          const data = body.extra ? { items: body.items, ...body.extra } : body.items;
          return { success: true as const, data, meta: body.meta };
        }
        return { success: true as const, data: body ?? null };
      }),
    );
  }
}
