import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { CurrentPlatformAdminContext } from './decorators/current-platform-admin-context.decorator';
import {
  PlatformAdminAvailableActionsResponseDto,
  PlatformAdminHomeResponseDto,
  PlatformAdminListResponseDto,
} from './dto/platform-admin-response.dto';
import { PlatformAdminExperienceGuard } from './guards/platform-admin-experience.guard';
import { PLATFORM_ADMIN_EXPERIENCE_API_TAG } from './platform-admin.constants';
import { PlatformAdminAvailableActionsService } from './services/platform-admin-available-actions.service';
import { PlatformAdminHomeService } from './services/platform-admin-home.service';
import { PlatformAdminProjectionService } from './services/platform-admin-projection.service';
import { type ResolvedPlatformAdminContext } from './types/platform-admin-context.types';

@ApiTags(PLATFORM_ADMIN_EXPERIENCE_API_TAG)
@ApiBearerAuth()
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Experience layer navigation and institutional workspace scope",
  authorityRequirement: "OfficialExperienceGuard for substantive routes; no authority from navigation",
  actorSource: "Session identity with resolved official or citizen context",
  primarySecurityInvariant: "Experience projections do not execute consequential government actions",
})
@Controller('experience/platform-admin')
@UseGuards(SessionAuthGuard, PlatformAdminExperienceGuard)
export class PlatformAdminController {
  constructor(
    private readonly homeService: PlatformAdminHomeService,
    private readonly projectionService: PlatformAdminProjectionService,
    private readonly availableActionsService: PlatformAdminAvailableActionsService,
  ) {}

  @Get('home')
  @ApiOperation({
    summary: 'Platform administration home summary',
    description:
      'Summarized configuration and operations information for authorized platform administrators.',
  })
  @ApiOkResponse({ type: PlatformAdminHomeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrative access policy required' })
  getHome(
    @CurrentPlatformAdminContext() context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminHomeResponseDto> {
    return this.homeService.buildHome(context);
  }

  @Get('institutions')
  @ApiOperation({ summary: 'Administrative projection of configured institutions' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listInstitutions(
    @CurrentPlatformAdminContext() context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listInstitutions(context);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Administrative projection of configured departments' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listDepartments(
    @CurrentPlatformAdminContext() context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listDepartments(context);
  }

  @Get('offices')
  @ApiOperation({ summary: 'Administrative projection of configured offices' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listOffices(
    @CurrentPlatformAdminContext() context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listOffices(context);
  }

  @Get('officeholders')
  @ApiOperation({ summary: 'Administrative projection of officeholders' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listOfficeholders(): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listOfficeholders();
  }

  @Get('services')
  @ApiOperation({ summary: 'Administrative projection of government services' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listServices(
    @CurrentPlatformAdminContext() context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listServices(context);
  }

  @Get('forms')
  @ApiOperation({ summary: 'Administrative projection of form definitions' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listForms(): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listForms();
  }

  @Get('workflows')
  @ApiOperation({ summary: 'Administrative projection of workflow definitions' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listWorkflows(): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listWorkflows();
  }

  @Get('integrations')
  @ApiOperation({ summary: 'Administrative projection of integrations' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listIntegrations(
    @CurrentPlatformAdminContext() context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listIntegrations(context);
  }

  @Get('communications')
  @ApiOperation({ summary: 'Administrative projection of communication templates' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listCommunications(
    @CurrentPlatformAdminContext() context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listCommunications(context);
  }

  @Get('ai-agents')
  @ApiOperation({ summary: 'Administrative projection of AI service identities' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listAiAgents(): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listAiAgents();
  }

  @Get('security')
  @ApiOperation({ summary: 'Administrative projection of security signals' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listSecurity(
    @CurrentPlatformAdminContext() context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listSecurity(context);
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Administrative projection of production readiness conditions' })
  @ApiOkResponse({ type: PlatformAdminListResponseDto })
  listReadiness(
    @CurrentPlatformAdminContext() context: ResolvedPlatformAdminContext,
  ): Promise<PlatformAdminListResponseDto> {
    return this.projectionService.listReadiness(context);
  }

  @Get('available-actions')
  @ApiOperation({
    summary: 'Discover governed administrative configuration actions',
    description:
      'Returns safe metadata describing available configuration actions. Does not execute consequential actions.',
  })
  @ApiOkResponse({ type: PlatformAdminAvailableActionsResponseDto })
  getAvailableActions(
    @CurrentPlatformAdminContext() context: ResolvedPlatformAdminContext,
  ): PlatformAdminAvailableActionsResponseDto {
    return this.availableActionsService.buildAvailableActions(context);
  }
}
