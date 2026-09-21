import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request } from 'express';

import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import {
  RESOURCE_SCOPE_METADATA_KEY,
  type ResourceScopeMetadata,
} from '../decorators/require-resource-scope.decorator';
import { ResourceAccessService } from '../resource-access.service';

type ScopedRequest = Request & {
  session?: SessionContextDto;
  resourceScopeEvaluation?: unknown;
};

@Injectable()
export class InstitutionalScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resourceAccess: ResourceAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.get<ResourceScopeMetadata | undefined>(
      RESOURCE_SCOPE_METADATA_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<ScopedRequest>();
    const session = request.session;

    if (!session?.identityId) {
      throw new InternalServerErrorException(
        'InstitutionalScopeGuard requires authenticated session context',
      );
    }

    const rawResourceId = request.params[metadata.paramName ?? 'id'];
    const resourceId = Array.isArray(rawResourceId) ? rawResourceId[0] : rawResourceId;
    if (!resourceId) {
      throw new InternalServerErrorException(
        `Resource scope param "${metadata.paramName ?? 'id'}" was not found on request`,
      );
    }

    const evaluation = await this.resourceAccess.assertAccess({
      session,
      resourceType: metadata.resourceType,
      resourceId,
      intent: metadata.intent,
      maskEnumeration: metadata.maskEnumeration,
    });

    request.resourceScopeEvaluation = evaluation;
    return true;
  }
}
