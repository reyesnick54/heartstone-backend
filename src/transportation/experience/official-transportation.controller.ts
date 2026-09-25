import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentOfficialContext } from '../../experience/official/decorators/current-official-context.decorator';
import {
  OfficialExperienceGuard,
  RequiresSubstantiveOfficialAccess,
} from '../../experience/official/guards/official-experience.guard';
import { type ResolvedOfficialContext } from '../../experience/official/types/official-context.types';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { OfficialTransportationProjectionService } from './services/official-transportation-projection.service';

@ApiTags('official-transportation-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('experience/official/transportation')
@UseGuards(SessionAuthGuard, OfficialExperienceGuard)
@ApiBearerAuth()
export class OfficialTransportationController {
  constructor(private readonly projections: OfficialTransportationProjectionService) {}

  @Get('workspace')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'Official transportation workspace queues and authority-gated actions' })
  getWorkspace(@CurrentOfficialContext() context: ResolvedOfficialContext) {
    return this.projections.buildWorkspace(context);
  }
}
