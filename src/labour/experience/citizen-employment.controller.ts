import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { CitizenEmploymentProjectionService } from './services/citizen-employment-projection.service';

@ApiTags('citizen-employment-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('experience/citizen/employment')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenEmploymentController {
  constructor(private readonly projections: CitizenEmploymentProjectionService) {}

  @Get()
  getHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getHome(session.identityId);
  }

  @Get('relationships')
  listRelationships(@CurrentSession() session: SessionContextDto) {
    return this.projections.listRelationships(session.identityId);
  }

  @Get('work-permits')
  listWorkPermits(@CurrentSession() session: SessionContextDto) {
    return this.projections.listWorkPermits(session.identityId);
  }

  @Get('applications')
  listApplications(@CurrentSession() session: SessionContextDto) {
    return this.projections.listApplications(session.identityId);
  }

  @Get('actions')
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
