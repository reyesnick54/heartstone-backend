import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentOfficialContext } from '../../experience/official/decorators/current-official-context.decorator';
import {
  OfficialExperienceGuard,
  RequiresSubstantiveOfficialAccess,
} from '../../experience/official/guards/official-experience.guard';
import { type ResolvedOfficialContext } from '../../experience/official/types/official-context.types';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import {
  OfficialImmigrationAvailableActionsResponseDto,
  OfficialImmigrationWorkspaceResponseDto,
} from './dto/official-immigration-response.dto';
import { OfficialImmigrationProjectionService } from './services/official-immigration-projection.service';

@ApiTags('official-immigration-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('experience/official/immigration')
@UseGuards(SessionAuthGuard, OfficialExperienceGuard)
@ApiBearerAuth()
export class OfficialImmigrationController {
  constructor(private readonly projections: OfficialImmigrationProjectionService) {}

  @Get('workspace')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'Immigration-specific official workspace queues and metrics' })
  @ApiOkResponse({ type: OfficialImmigrationWorkspaceResponseDto })
  getWorkspace(@CurrentOfficialContext() context: ResolvedOfficialContext) {
    return this.projections.buildWorkspace(context);
  }

  @Get('cases/:id/available-actions')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({
    summary: 'Immigration case actions with authority and external dependency evaluation',
  })
  @ApiOkResponse({ type: OfficialImmigrationAvailableActionsResponseDto })
  getAvailableActions(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
    @Param('id', ParseUUIDPipe) caseId: string,
  ) {
    return this.projections.getAvailableActions(context, caseId);
  }
}
