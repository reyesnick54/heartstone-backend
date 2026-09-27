import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { CitizenPropertyProjectionService } from './services/citizen-property-projection.service';

@ApiTags('citizen-property-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('experience/citizen/property')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenPropertyController {
  constructor(private readonly projections: CitizenPropertyProjectionService) {}

  @Get()
  @ApiOperation({ summary: 'Citizen property registry home for authorized interests' })
  getHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getHome(session.identityId);
  }

  @Get('interests')
  listInterests(@CurrentSession() session: SessionContextDto) {
    return this.projections.listInterests(session.identityId);
  }

  @Get('applications')
  listApplications(@CurrentSession() session: SessionContextDto) {
    return this.projections.listApplications(session.identityId);
  }

  @Get('documents')
  listDocuments(@CurrentSession() session: SessionContextDto) {
    return this.projections.listDocuments(session.identityId);
  }

  @Get('actions')
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
