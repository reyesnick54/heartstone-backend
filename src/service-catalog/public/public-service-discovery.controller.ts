import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { Public } from '../../security/decorators/public.decorator';
import { RouteClass } from '../../security/route-class.enum';
import type {
  PublicEligibilityResult,
  PublicServiceDetail,
  ServiceStartPackage,
} from '../common/public-service.mapper';
import { MatchPublicServicesDto } from './dto/match-public-services.dto';
import { PublicServiceEligibilityDto } from './dto/public-service-eligibility.dto';
import {
  PaginatedPublicServicesResponseDto,
  PublicServiceSummaryResponseDto,
} from './dto/public-service-response.dto';
import { QueryPublicServicesDto } from './dto/query-public-services.dto';
import { QueryServiceStartPackageDto } from './dto/query-service-start-package.dto';
import { PublicServiceDiscoveryService } from './public-service-discovery.service';

@ApiTags('public-services')
@Public()
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Service catalog administration or public discovery opt-out",
  authorityRequirement: "Catalog configuration authority for protected routes",
  actorSource: "Administrator or anonymous reader for explicitly public catalog routes",
  primarySecurityInvariant: "Published catalog visibility does not grant case or decision access",
})
@Controller('public/services')
export class PublicServiceDiscoveryController {
  constructor(private readonly publicServiceDiscoveryService: PublicServiceDiscoveryService) {}

  @Get()
  @ApiOperation({ summary: 'List publicly discoverable government services' })
  @ApiOkResponse({ type: PaginatedPublicServicesResponseDto })
  listServices(
    @Query() query: QueryPublicServicesDto,
  ): Promise<PaginatedPublicServicesResponseDto> {
    return this.publicServiceDiscoveryService.listServices(query);
  }

  @Post('match')
  @ApiOperation({ summary: 'Match citizen-facing needs to published services' })
  @ApiOkResponse({ type: PublicServiceSummaryResponseDto, isArray: true })
  matchServices(@Body() dto: MatchPublicServicesDto): Promise<PublicServiceSummaryResponseDto[]> {
    return this.publicServiceDiscoveryService.matchServices(dto);
  }

  @Get(':slug/start-package')
  @ApiOperation({ summary: 'Get the pre-application start package for a service' })
  getStartPackage(
    @Param('slug') slug: string,
    @Query() query: QueryServiceStartPackageDto,
  ): Promise<ServiceStartPackage> {
    return this.publicServiceDiscoveryService.getStartPackage(slug, query);
  }

  @Post(':slug/eligibility')
  @ApiOperation({ summary: 'Evaluate nonbinding eligibility guidance for a service' })
  evaluateEligibility(
    @Param('slug') slug: string,
    @Body() dto: PublicServiceEligibilityDto,
  ): Promise<PublicEligibilityResult> {
    return this.publicServiceDiscoveryService.evaluateEligibility(slug, dto);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get public detail for a discoverable service' })
  @ApiOkResponse({ type: PublicServiceSummaryResponseDto })
  getServiceBySlug(@Param('slug') slug: string): Promise<PublicServiceDetail> {
    return this.publicServiceDiscoveryService.getServiceBySlug(slug);
  }
}
