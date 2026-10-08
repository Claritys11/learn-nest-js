import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';

// Menangkap semua HttpException (400, 404, dst.) lalu membungkusnya
// ke format { success: false, message, errors } sesuai README.
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    let message = exception.message;
    let errors: unknown[] = [];

    if (typeof body === 'object' && body !== null) {
      const { message: bodyMessage, errors: bodyErrors } = body as {
        message?: string | string[];
        errors?: unknown[];
      };
      if (typeof bodyMessage === 'string') message = bodyMessage;
      if (Array.isArray(bodyMessage)) message = bodyMessage.join(', ');
      if (Array.isArray(bodyErrors)) errors = bodyErrors;
    }

    response.status(status).json({ success: false, message, errors });
  }
}
