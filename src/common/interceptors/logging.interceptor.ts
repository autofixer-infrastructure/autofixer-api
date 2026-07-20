import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    const { method, url, body, ip, headers } = request;
    const requestId = (headers['x-request-id'] as string) || uuidv4();
    const userAgent = headers['user-agent'] || 'Unknown';
    
    // Add request ID to response headers
    response.setHeader('X-Request-Id', requestId);
    
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] ${method} ${url} - Started - IP: ${ip} - User-Agent: ${userAgent}`,
    );

    // Log request body (sanitized)
    if (Object.keys(body || {}).length > 0) {
      const sanitizedBody = this.sanitizeBody(body);
      this.logger.debug(`[${requestId}] Body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          this.logger.log(
            `[${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          
          this.logger.error(
            `[${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    const sensitiveFields = ['password', 'token', 'refreshToken', 'secret', 'authorization'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }
}
