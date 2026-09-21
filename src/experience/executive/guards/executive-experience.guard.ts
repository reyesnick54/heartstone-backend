import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { type AuthenticatedRequest } from '../../../identity/auth/guards/session-auth.guard';
import { ExecutiveContextService } from '../services/executive-context.service';
import { type ResolvedExecutiveContext } from '../types/executive-context.types';

export interface ExecutiveExperienceRequest extends AuthenticatedRequest {
  executiveContext?: ResolvedExecutiveContext;
}

@Injectable()
export class ExecutiveExperienceGuard implements CanActivate {
  constructor(private readonly executiveContext: ExecutiveContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ExecutiveExperienceRequest>();
    const actor = request.actor;

    if (!actor?.identityId) {
      throw new UnauthorizedException('Authentication required for executive experience');
    }

    request.executiveContext = await this.executiveContext.resolveContext(actor);
    return true;
  }
}
