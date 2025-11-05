import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    this.logger.log(`→ ${method} ${url} - ${ip} - ${userAgent}`);

    return next.handle().pipe(
      tap({
        next: (): void => {
          const responseTime = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;

          this.logger.log(
            `← ${method} ${url} - ${statusCode} - ${responseTime}ms`,
          );
        },
        error: (error: Error): void => {
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `← ${method} ${url} - ERROR - ${responseTime}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
