import {
  type CallHandler,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { FORBIDDEN_CLIENT_DOCUMENT_FIELDS } from '../evidence-records.constants';

@Injectable()
export class ForbiddenDocumentFieldsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ body?: Record<string, unknown> }>();

    if (request.body) {
      for (const field of FORBIDDEN_CLIENT_DOCUMENT_FIELDS) {
        if (field in request.body && request.body[field] !== undefined) {
          throw new ForbiddenException(`Client may not set "${field}"`);
        }
      }
    }

    return next.handle();
  }
}
