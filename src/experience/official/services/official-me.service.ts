import { Injectable } from '@nestjs/common';

import { OfficialMeResponseDto } from '../dto/official-me-response.dto';
import { type ResolvedOfficialContext } from '../types/official-context.types';

@Injectable()
export class OfficialMeService {
  buildMeResponse(context: ResolvedOfficialContext): OfficialMeResponseDto {
    return {
      identityId: context.identityId,
      identityType: context.identityType,
      displayName: context.displayName,
      assuranceLevel: context.assuranceLevel,
      userAccountId: context.userAccountId,
      officeholderLinks: context.officeholderLinks,
      activeAppointments: context.activeAppointments,
      activeDelegations: context.activeDelegations,
      institutionalContext: context.institutionalContext,
      technicalCapabilities: context.technicalCapabilities,
      authorityDisclaimer: context.authorityDisclaimer,
      hasUniversalAuthority: false,
    };
  }
}
