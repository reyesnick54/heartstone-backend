import {
  type CallHandler,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import {
  FORBIDDEN_CLIENT_ACTOR_IDENTITY_FIELDS,
  FORBIDDEN_CLIENT_AUTHORITY_INDICATORS,
} from '../intelligence.constants';

@Injectable()
export class IntelligenceForbiddenClientFieldsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ body?: Record<string, unknown> }>();

    if (request.body) {
      for (const field of FORBIDDEN_CLIENT_ACTOR_IDENTITY_FIELDS) {
        if (field in request.body && request.body[field] !== undefined) {
          throw new ForbiddenException(`Forged acting identity field "${field}" rejected`);
        }
      }

      for (const field of FORBIDDEN_CLIENT_AUTHORITY_INDICATORS) {
        if (field in request.body && request.body[field] !== undefined) {
          throw new ForbiddenException(`Client may not supply authority indicator "${field}"`);
        }
      }
    }

    return next.handle();
  }
}
