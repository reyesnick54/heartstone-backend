import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
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
import { OfficialLabourProjectionService } from './services/official-labour-projection.service';

@ApiTags('official-labour-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('experience/official/labour')
@UseGuards(SessionAuthGuard, OfficialExperienceGuard)
@ApiBearerAuth()
export class OfficialLabourController {
  constructor(private readonly projections: OfficialLabourProjectionService) {}

  @Get('workspace')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'Official labour workspace queues (authority-aware, NON_PRODUCTION)' })
  getWorkspace(@CurrentOfficialContext() context: ResolvedOfficialContext) {
    return this.projections.buildWorkspace(context);
  }

  @Get('dashboard')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({
    summary: 'Labour department dashboard indicators with sensitive aggregation guards',
  })
  getDashboard(@CurrentOfficialContext() context: ResolvedOfficialContext) {
    return this.projections.buildDashboard(context);
  }

  @Get('work-permits/:id/available-actions')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'Work permit actions with execution-time authority evaluation' })
  getAvailableActions(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
    @Param('id', ParseUUIDPipe) workPermitRecordId: string,
  ) {
    return this.projections.getAvailableActions(context, workPermitRecordId);
  }
}
