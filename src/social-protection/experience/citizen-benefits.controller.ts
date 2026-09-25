import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { CitizenBenefitsProjectionService } from './services/citizen-benefits-projection.service';

@ApiTags('citizen-benefits-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('experience/citizen/benefits')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenBenefitsController {
  constructor(private readonly projections: CitizenBenefitsProjectionService) {}

  @Get()
  getHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getHome(session.identityId);
  }

  @Get('programs')
  listPrograms(@CurrentSession() session: SessionContextDto) {
    return this.projections.listPrograms(session.identityId);
  }

  @Get('applications')
  listApplications(@CurrentSession() session: SessionContextDto) {
    return this.projections.listApplications(session.identityId);
  }

  @Get('awards')
  listAwards(@CurrentSession() session: SessionContextDto) {
    return this.projections.listAwards(session.identityId);
  }

  @Get('payments')
  listPayments(@CurrentSession() session: SessionContextDto) {
    return this.projections.listPayments(session.identityId);
  }

  @Get('actions')
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
