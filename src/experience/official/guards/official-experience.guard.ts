import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IdentityType } from '@prisma/client';

import { SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { OfficialExperienceAccessDeniedException } from '../exceptions/official-experience.exceptions';
import { OfficialContextService } from '../services/official-context.service';
import { type ResolvedOfficialContext } from '../types/official-context.types';

export const OFFICIAL_SUBSTANTIVE_ACCESS_KEY = 'officialSubstantiveAccess';

export const RequiresSubstantiveOfficialAccess = () =>
  SetMetadata(OFFICIAL_SUBSTANTIVE_ACCESS_KEY, true);

export interface OfficialExperienceRequest {
  session?: SessionContextDto;
  officialContext?: ResolvedOfficialContext;
}

@Injectable()
export class OfficialExperienceGuard implements CanActivate {
  constructor(
    private readonly officialContext: OfficialContextService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OfficialExperienceRequest>();
    const session = request.session;

    if (!session?.identityId) {
      throw new UnauthorizedException('Authentication required for official experience');
    }

    const resolved = await this.officialContext.resolveContext(
      session.identityId,
      session.assuranceLevel,
    );

    if (resolved.identityType === IdentityType.SERVICE) {
      throw new OfficialExperienceAccessDeniedException(
        'Service or AI identities cannot access the human official workspace',
      );
    }

    if (!resolved.technicalCapabilities.hasOfficeholderLink) {
      throw new OfficialExperienceAccessDeniedException(
        'No officeholder relationship exists for this identity',
      );
    }

    const requiresSubstantive = this.reflector.getAllAndOverride<boolean>(
      OFFICIAL_SUBSTANTIVE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiresSubstantive && !resolved.technicalCapabilities.substantiveAccessAllowed) {
      throw new OfficialExperienceAccessDeniedException(
        'Active appointment required for substantive official workspace access',
      );
    }

    if (requiresSubstantive && resolved.technicalCapabilities.isTechnicalAdminOnly) {
      throw new OfficialExperienceAccessDeniedException(
        'Technical platform administration does not confer substantive case access',
      );
    }

    request.officialContext = resolved;
    return true;
  }
}
