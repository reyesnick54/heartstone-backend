import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../../security/route-class.enum';
import { ProviderHealthcareProjectionService } from './services/provider-healthcare-projection.service';

@ApiTags('provider-healthcare-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
  authenticationRequired: true,
  scopeRequirement: "Patient-owned healthcare profile or provider policy-scoped access",
  authorityRequirement: "HealthcareDataAccessPolicy for provider routes; no autonomous clinical authority",
  actorSource: "Session identity with patient or governed provider context",
  primarySecurityInvariant: "Program discovery != medical recommendation; application != clinical authorization",
})
@Controller('experience/provider/healthcare')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ProviderHealthcareController {
  constructor(private readonly projections: ProviderHealthcareProjectionService) {}

  @Get('workspace')
  @ApiOperation({
    summary: 'Provider healthcare workspace governed by HealthcareDataAccessPolicy',
  })
  @ApiOkResponse({ description: 'Provider-safe patient treatment projections' })
  getWorkspace(@CurrentSession() session: SessionContextDto) {
    return this.projections.getWorkspace(session.identityId);
  }
}
