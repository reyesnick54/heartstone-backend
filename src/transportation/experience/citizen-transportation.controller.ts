import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { CitizenTransportationProjectionService } from './services/citizen-transportation-projection.service';

@ApiTags('citizen-transportation-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('experience/citizen')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenTransportationController {
  constructor(private readonly projections: CitizenTransportationProjectionService) {}

  @Get('transportation')
  @ApiOperation({ summary: 'Citizen transportation home' })
  getTransportationHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getTransportationHome(session.identityId);
  }

  @Get('driver-licenses')
  listDriverLicenses(@CurrentSession() session: SessionContextDto) {
    return this.projections.listDriverLicenses(session.identityId);
  }

  @Get('vehicles')
  listVehicles(@CurrentSession() session: SessionContextDto) {
    return this.projections.listVehicles(session.identityId);
  }

  @Get('vehicle-applications')
  listVehicleApplications(@CurrentSession() session: SessionContextDto) {
    return this.projections.listVehicleApplications(session.identityId);
  }

  @Get('transportation/actions')
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
