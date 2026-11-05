import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import {
  CitizenDriverLicenseSummaryDto,
  CitizenTransportationActionsResponseDto,
  CitizenTransportationHomeResponseDto,
  CitizenVehicleApplicationItemDto,
  CitizenVehicleItemDto,
} from './dto/citizen-transportation-response.dto';
import { CitizenTransportationProjectionService } from './services/citizen-transportation-projection.service';

@ApiTags('citizen-transportation-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant: 'Application and submission endpoints do not confer official outcomes',
})
@Controller('experience/citizen')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenTransportationController {
  constructor(private readonly projections: CitizenTransportationProjectionService) {}

  @Get('transportation')
  @ApiOperation({ summary: 'Citizen transportation home' })
  @ApiOkResponse({ type: CitizenTransportationHomeResponseDto })
  getTransportationHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getTransportationHome(session.identityId);
  }

  @Get('driver-licenses')
  @ApiOperation({ summary: 'List driver licenses held by the authenticated citizen' })
  @ApiOkResponse({ type: CitizenDriverLicenseSummaryDto, isArray: true })
  listDriverLicenses(@CurrentSession() session: SessionContextDto) {
    return this.projections.listDriverLicenses(session.identityId);
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'List vehicles the citizen is authorized to view' })
  @ApiOkResponse({ type: CitizenVehicleItemDto, isArray: true })
  listVehicles(@CurrentSession() session: SessionContextDto) {
    return this.projections.listVehicles(session.identityId);
  }

  @Get('vehicle-applications')
  @ApiOperation({ summary: 'List transportation service cases opened by the citizen' })
  @ApiOkResponse({ type: CitizenVehicleApplicationItemDto, isArray: true })
  listVehicleApplications(@CurrentSession() session: SessionContextDto) {
    return this.projections.listVehicleApplications(session.identityId);
  }

  @Get('transportation/actions')
  @ApiOperation({ summary: 'List self-service transportation actions available to the citizen' })
  @ApiOkResponse({ type: CitizenTransportationActionsResponseDto })
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
