import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  BusinessCorporateActionsResponseDto,
  BusinessCorporateCertificatesResponseDto,
  BusinessCorporateFilingsResponseDto,
  BusinessCorporateOfficersResponseDto,
  BusinessCorporateProfileResponseDto,
} from './dto/business-corporate-registry.dto';
import { BusinessCorporateRegistryService } from './services/business-corporate-registry.service';

@ApiTags('business-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Experience layer navigation and institutional workspace scope",
  authorityRequirement: "OfficialExperienceGuard for substantive routes; no authority from navigation",
  actorSource: "Session identity with resolved official or citizen context",
  primarySecurityInvariant: "Experience projections do not execute consequential government actions",
})
@Controller('experience/business')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BusinessCorporateRegistryController {
  constructor(private readonly corporateRegistryService: BusinessCorporateRegistryService) {}

  @Get('organizations/:organizationId/corporate-profile')
  @ApiOperation({
    summary: 'Get corporate registry profile for an accessible business organization',
  })
  @ApiOkResponse({ type: BusinessCorporateProfileResponseDto })
  getCorporateProfile(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<BusinessCorporateProfileResponseDto> {
    return this.corporateRegistryService.getCorporateProfile(session.identityId, organizationId);
  }

  @Get('organizations/:organizationId/filings')
  @ApiOperation({ summary: 'List corporate filings for an organization' })
  @ApiOkResponse({ type: BusinessCorporateFilingsResponseDto })
  listFilings(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BusinessCorporateFilingsResponseDto> {
    return this.corporateRegistryService.listFilings(session.identityId, organizationId, query);
  }

  @Get('organizations/:organizationId/officers')
  @ApiOperation({ summary: 'List disclosed corporate officers for an organization' })
  @ApiOkResponse({ type: BusinessCorporateOfficersResponseDto })
  listOfficers(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<BusinessCorporateOfficersResponseDto> {
    return this.corporateRegistryService.listOfficers(session.identityId, organizationId);
  }

  @Get('organizations/:organizationId/corporate-certificates')
  @ApiOperation({ summary: 'List corporate certificates for an organization' })
  @ApiOkResponse({ type: BusinessCorporateCertificatesResponseDto })
  listCertificates(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<BusinessCorporateCertificatesResponseDto> {
    return this.corporateRegistryService.listCertificates(session.identityId, organizationId);
  }

  @Get('organizations/:organizationId/corporate-actions')
  @ApiOperation({ summary: 'List outstanding corporate registry actions for an organization' })
  @ApiOkResponse({ type: BusinessCorporateActionsResponseDto })
  listCorporateActions(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<BusinessCorporateActionsResponseDto> {
    return this.corporateRegistryService.listCorporateActions(session.identityId, organizationId);
  }
}
