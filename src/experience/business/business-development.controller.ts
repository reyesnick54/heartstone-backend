import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { PlanningConstructionScopeService } from '../../planning-construction/experience/services/planning-construction-scope.service';

@ApiTags('business-experience')
@Controller('experience/business/organizations/:organizationId/development-projects')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BusinessDevelopmentController {
  constructor(private readonly scope: PlanningConstructionScopeService) {}

  @Get()
  listProjects(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.scope.listOrganizationProjects(session.identityId, organizationId);
  }

  @Get(':projectId/permits')
  listPermits(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.scope.listOrganizationPermits(session.identityId, organizationId, projectId);
  }

  @Get(':projectId/inspections')
  listInspections(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.scope.listOrganizationInspections(session.identityId, organizationId, projectId);
  }

  @Get(':projectId/actions')
  listActions(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.scope.listOrganizationActions(session.identityId, organizationId, projectId);
  }

  @Get(':projectId')
  getProject(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.scope.getOrganizationProject(session.identityId, organizationId, projectId);
  }
}
