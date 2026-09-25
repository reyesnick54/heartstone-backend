import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { Public } from '../../security/decorators/public.decorator';
import { RouteClass } from '../../security/route-class.enum';
import type {
  PublicEligibilityResult,
  PublicServiceDetail,
} from '../../service-catalog/common/public-service.mapper';
import { MatchPublicServicesDto } from '../../service-catalog/public/dto/match-public-services.dto';
import { PublicServiceEligibilityDto } from '../../service-catalog/public/dto/public-service-eligibility.dto';
import {
  PaginatedPublicServicesResponseDto,
  PublicServiceSummaryResponseDto,
} from '../../service-catalog/public/dto/public-service-response.dto';
import { QueryPublicServicesDto } from '../../service-catalog/public/dto/query-public-services.dto';
import { QueryServiceStartPackageDto } from '../../service-catalog/public/dto/query-service-start-package.dto';
import { CitizenServicesService, type CitizenStartExperience } from './citizen-services.service';
import { CreateCitizenApplicationDto } from './dto/create-citizen-application.dto';

@ApiTags('citizen-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Experience layer navigation and institutional workspace scope",
  authorityRequirement: "OfficialExperienceGuard for substantive routes; no authority from navigation",
  actorSource: "Session identity with resolved official or citizen context",
  primarySecurityInvariant: "Experience projections do not execute consequential government actions",
})
@Controller('experience/citizen/services')
export class CitizenServicesController {
  constructor(private readonly citizenServicesService: CitizenServicesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Discover active government services without knowing the responsible department',
  })
  @ApiOkResponse({ type: PaginatedPublicServicesResponseDto })
  listServices(
    @Query() query: QueryPublicServicesDto,
  ): Promise<PaginatedPublicServicesResponseDto> {
    return this.citizenServicesService.listServices(query);
  }

  @Public()
  @Post('match')
  @ApiOperation({ summary: 'Match citizen needs to published government services' })
  @ApiOkResponse({ type: PublicServiceSummaryResponseDto, isArray: true })
  matchServices(@Body() dto: MatchPublicServicesDto): Promise<PublicServiceSummaryResponseDto[]> {
    return this.citizenServicesService.matchServices(dto);
  }

  @Public()
  @Get(':slug/start')
  @ApiOperation({ summary: 'Get a version-pinned start package for guided service intake' })
  getStartExperience(
    @Param('slug') slug: string,
    @Query() query: QueryServiceStartPackageDto,
  ): Promise<CitizenStartExperience> {
    return this.citizenServicesService.getStartExperience(slug, query);
  }

  @Public()
  @Post(':slug/eligibility')
  @ApiOperation({ summary: 'Evaluate nonbinding preliminary eligibility guidance' })
  evaluateEligibility(
    @Param('slug') slug: string,
    @Body() dto: PublicServiceEligibilityDto,
  ): Promise<PublicEligibilityResult> {
    return this.citizenServicesService.evaluateEligibility(slug, dto);
  }

  @Post(':slug/applications')
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a draft application for a service identified by slug' })
  createApplication(
    @Param('slug') slug: string,
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CreateCitizenApplicationDto,
  ) {
    return this.citizenServicesService.createApplication(slug, session.identityId, dto);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get citizen-facing detail for a discoverable government service' })
  @ApiOkResponse({ type: PublicServiceSummaryResponseDto })
  getServiceBySlug(@Param('slug') slug: string): Promise<PublicServiceDetail> {
    return this.citizenServicesService.getServiceBySlug(slug);
  }
}
