import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface PayloadTooLargeError extends Error {
  type?: string;
  status?: number;
}

function isPayloadTooLargeError(
  exception: unknown,
): exception is PayloadTooLargeError {
  return (
    exception instanceof Error &&
    ((exception as PayloadTooLargeError).type === 'entity.too.large' ||
      (exception as PayloadTooLargeError).status === 413)
  );
}

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly nodeEnv: string = process.env.NODE_ENV ?? 'development',
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = isPayloadTooLargeError(exception)
      ? HttpStatus.PAYLOAD_TOO_LARGE
      : exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] = isPayloadTooLargeError(exception)
      ? 'Request body too large'
      : 'Internal server error';
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      message = (exceptionResponse as { message: string | string[] }).message;
    }

    if (status >= 500 && this.nodeEnv === 'production') {
      message = 'Internal server error';
    }

    const errorBody: ErrorResponseBody = {
      statusCode: status,
      message,
      error: HttpStatus[status] ?? 'Error',
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(
        {
          err: exception instanceof Error ? exception : undefined,
          path: request.url,
          method: request.method,
          statusCode: status,
        },
        'Unhandled exception',
      );
    } else {
      this.logger.warn(
        {
          path: request.url,
          method: request.method,
          statusCode: status,
          message,
        },
        'Request failed',
      );
    }

    response.status(status).json(errorBody);
  }
}
