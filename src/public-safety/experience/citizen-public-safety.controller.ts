import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import {
  CitizenEmergencyEventsResponseDto,
  CitizenIncidentReportsResponseDto,
  CitizenPublicSafetyActionsResponseDto,
  CitizenPublicSafetyHomeResponseDto,
  CitizenRecoveryAssistanceResponseDto,
} from './dto/citizen-public-safety-response.dto';
import { CitizenPublicSafetyProjectionService } from './services/citizen-public-safety-projection.service';

@ApiTags('citizen-public-safety-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant: 'Application and submission endpoints do not confer official outcomes',
})
@Controller('experience/citizen/public-safety')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenPublicSafetyController {
  constructor(private readonly projections: CitizenPublicSafetyProjectionService) {}

  @Get()
  @ApiOperation({ summary: 'Citizen public safety home (informational projections)' })
  @ApiOkResponse({ type: CitizenPublicSafetyHomeResponseDto })
  getHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.buildHome(session.identityId);
  }

  @Get('reports')
  @ApiOperation({ summary: 'List incident reports submitted by the authenticated citizen' })
  @ApiOkResponse({ type: CitizenIncidentReportsResponseDto })
  listReports(@CurrentSession() session: SessionContextDto) {
    return this.projections.listReports(session.identityId);
  }

  @Get('emergency-events')
  @ApiOperation({ summary: 'List open public emergency events (informational)' })
  @ApiOkResponse({ type: CitizenEmergencyEventsResponseDto })
  listEmergencyEvents() {
    return this.projections.listEmergencyEvents();
  }

  @Get('assistance')
  @ApiOperation({ summary: 'List recovery assistance applications for the authenticated citizen' })
  @ApiOkResponse({ type: CitizenRecoveryAssistanceResponseDto })
  listAssistance(@CurrentSession() session: SessionContextDto) {
    return this.projections.listAssistance(session.identityId);
  }

  @Get('actions')
  @ApiOperation({
    summary: 'List open public safety service requests the citizen can follow up on',
  })
  @ApiOkResponse({ type: CitizenPublicSafetyActionsResponseDto })
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
