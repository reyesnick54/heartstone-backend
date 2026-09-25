import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { BusinessEducationService } from './services/business-education.service';

@ApiTags('business-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Experience layer navigation and institutional workspace scope",
  authorityRequirement: "OfficialExperienceGuard for substantive routes; no authority from navigation",
  actorSource: "Session identity with resolved official or citizen context",
  primarySecurityInvariant: "Experience projections do not execute consequential government actions",
})
@Controller('experience/business/organizations/:organizationId/education')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BusinessEducationController {
  constructor(private readonly educationService: BusinessEducationService) {}

  @Get()
  @ApiOperation({ summary: 'Business education provider home for authorized organization' })
  getHome(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.educationService.getHome(session.identityId, organizationId);
  }

  @Get('licensing')
  listLicensing(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.educationService.listLicensing(session.identityId, organizationId);
  }

  @Get('accreditation')
  listAccreditation(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.educationService.listAccreditation(session.identityId, organizationId);
  }

  @Get('inspections')
  listInspections(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.educationService.listInspections(session.identityId, organizationId);
  }

  @Get('actions')
  listActions(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.educationService.listActions(session.identityId, organizationId);
  }
}
