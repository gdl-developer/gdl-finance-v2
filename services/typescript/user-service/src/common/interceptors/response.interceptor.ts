import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ForbiddenException } from '@nestjs/common';

export interface Response<T> {
  status_code: number;
  success: boolean;
  response_code: string;
  response_description: string;
  data: T;
  meta?: Record<string, any>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    if (request.url === '/metrics') {
      const authHeader = request.headers['x-metrics-key'];
      const expectedKey = process.env.PROMETHEUS_METRICS_KEY;

      if (!expectedKey || authHeader !== expectedKey) {
        throw new ForbiddenException('Metrics access denied');
      }
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        let finalData = data;
        let meta: Record<string, any> | undefined;

        if (data && typeof data === 'object' && data.hasOwnProperty('data')) {
          finalData = data.data;
          // Preserve meta if present (paginated responses)
          if (data.hasOwnProperty('meta')) {
            meta = data.meta;
          }
        }

        const envelope: Response<T> = {
          status_code: context.switchToHttp().getResponse().statusCode,
          success: true,
          response_code: '00',
          response_description: 'Success',
          data: finalData,
        };

        if (meta !== undefined) {
          envelope.meta = meta;
        }

        return envelope;
      }),
    );
  }
}
