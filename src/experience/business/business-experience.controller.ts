import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { BusinessActionsResponseDto } from './dto/business-action.dto';
import { BusinessApplicationsResponseDto } from './dto/business-application.dto';
import { BusinessComplianceResponseDto } from './dto/business-compliance.dto';
import { BusinessHomeResponseDto } from './dto/business-home-response.dto';
import { BusinessLicensesResponseDto } from './dto/business-license.dto';
import { BusinessMessagesResponseDto } from './dto/business-message.dto';
import {
  BusinessOrganizationDetailDto,
  BusinessOrganizationsResponseDto,
} from './dto/business-organization.dto';
import { BusinessPaymentsResponseDto } from './dto/business-payment.dto';
import { BusinessProjectsResponseDto } from './dto/business-project.dto';
import { BusinessActionCenterService } from './services/business-action-center.service';
import { BusinessApplicationsService } from './services/business-applications.service';
import { BusinessComplianceService } from './services/business-compliance.service';
import { BusinessHomeService } from './services/business-home.service';
import { BusinessLicensesService } from './services/business-licenses.service';
import { BusinessMessagesService } from './services/business-messages.service';
import { BusinessOrganizationDetailService } from './services/business-organization-detail.service';
import { BusinessOrganizationsService } from './services/business-organizations.service';
import { BusinessPaymentsService } from './services/business-payments.service';
import { BusinessProjectsService } from './services/business-projects.service';

@ApiTags('business-experience')
@Controller('experience/business')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BusinessExperienceController {
  constructor(
    private readonly organizationsService: BusinessOrganizationsService,
    private readonly organizationDetailService: BusinessOrganizationDetailService,
    private readonly homeService: BusinessHomeService,
    private readonly actionCenterService: BusinessActionCenterService,
    private readonly applicationsService: BusinessApplicationsService,
    private readonly licensesService: BusinessLicensesService,
    private readonly complianceService: BusinessComplianceService,
    private readonly paymentsService: BusinessPaymentsService,
    private readonly messagesService: BusinessMessagesService,
    private readonly projectsService: BusinessProjectsService,
  ) {}

  @Get('organizations')
  @ApiOperation({
    summary:
      'List organizations accessible to the authenticated actor via membership or representative authority',
  })
  @ApiOkResponse({ type: BusinessOrganizationsResponseDto })
  listOrganizations(
    @CurrentSession() session: SessionContextDto,
  ): Promise<BusinessOrganizationsResponseDto> {
    return this.organizationsService.listOrganizations(session.identityId);
  }

  @Get('organizations/:organizationId')
  @ApiOperation({ summary: 'Get organization detail for an accessible business organization' })
  @ApiOkResponse({ type: BusinessOrganizationDetailDto })
  getOrganization(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<BusinessOrganizationDetailDto> {
    return this.organizationDetailService.getOrganizationDetail(session.identityId, organizationId);
  }

  @Get('organizations/:organizationId/home')
  @ApiOperation({
    summary: 'Get frontend-ready business home dashboard summary for an organization',
  })
  @ApiOkResponse({ type: BusinessHomeResponseDto })
  getHome(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<BusinessHomeResponseDto> {
    return this.homeService.getHome(session.identityId, organizationId);
  }

  @Get('organizations/:organizationId/actions')
  @ApiOperation({
    summary:
      'List actionable business tasks derived from existing platform state for an organization',
  })
  @ApiOkResponse({ type: BusinessActionsResponseDto })
  getActions(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BusinessActionsResponseDto> {
    return this.actionCenterService.listActions(session.identityId, organizationId, query);
  }

  @Get('organizations/:organizationId/applications')
  @ApiOperation({ summary: 'List applications accessible for the organization' })
  @ApiOkResponse({ type: BusinessApplicationsResponseDto })
  listApplications(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BusinessApplicationsResponseDto> {
    return this.applicationsService.listApplications(session.identityId, organizationId, query);
  }

  @Get('organizations/:organizationId/licenses')
  @ApiOperation({ summary: 'List active licenses and permits held by the organization' })
  @ApiOkResponse({ type: BusinessLicensesResponseDto })
  listLicenses(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BusinessLicensesResponseDto> {
    return this.licensesService.listLicenses(session.identityId, organizationId, query);
  }

  @Get('organizations/:organizationId/compliance')
  @ApiOperation({
    summary: 'List compliance matters and outstanding obligations for the organization',
  })
  @ApiOkResponse({ type: BusinessComplianceResponseDto })
  listCompliance(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BusinessComplianceResponseDto> {
    return this.complianceService.listCompliance(session.identityId, organizationId, query);
  }

  @Get('organizations/:organizationId/payments')
  @ApiOperation({ summary: 'List outstanding fees and invoices for the organization' })
  @ApiOkResponse({ type: BusinessPaymentsResponseDto })
  listPayments(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BusinessPaymentsResponseDto> {
    return this.paymentsService.listPayments(session.identityId, organizationId, query);
  }

  @Get('organizations/:organizationId/messages')
  @ApiOperation({ summary: 'List applicant-visible government messages for the organization' })
  @ApiOkResponse({ type: BusinessMessagesResponseDto })
  listMessages(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BusinessMessagesResponseDto> {
    return this.messagesService.listMessages(session.identityId, organizationId, query);
  }

  @Get('organizations/:organizationId/projects')
  @ApiOperation({ summary: 'List strategic investment projects linked to organization cases' })
  @ApiOkResponse({ type: BusinessProjectsResponseDto })
  listProjects(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BusinessProjectsResponseDto> {
    return this.projectsService.listProjects(session.identityId, organizationId, query);
  }
}
