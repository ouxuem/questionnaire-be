import { Injectable, Inject, ExecutionContext, CallHandler, NestInterceptor } from '@nestjs/common';
import { WINSTON_LOGGER_TOKEN } from './winston/winston.module';
import { MyLogger } from './my_logger';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { Response, Request } from 'express';
import { type_jwt_user_data } from './typing/jwt_user_data_type';

declare module 'express' {
  interface Request {
    user: type_jwt_user_data
  }
}
@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_LOGGER_TOKEN) private logger: MyLogger) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;

    const now = Date.now();
    this.logger.log(`Request: ${method} ${url} - ${userAgent} ${ip}`, 'HTTP');
    this.logger.log(`Handler: ${className}.${handlerName}`, 'HTTP');
    if (request.user) {
      this.logger.log(`User: ${request.user.username}`, 'HTTP');
    }

    return next.handle().pipe(
      tap((data) => {
        const response = context.switchToHttp().getResponse<Response>();
        const { statusCode } = response;
        const duration = Date.now() - now;
        this.logger.log(`Response: ${method} ${url} ${statusCode} - ${duration}ms`, 'HTTP');
      }),
      catchError((error) => {
        const duration = Date.now() - now;
        this.logger.error(error, 'HTTP');
        this.logger.error(`Error: ${method} ${url} - ${error.message} - ${duration}ms`, 'HTTP');
        return throwError(() => error);
      })
    );
  }
}
