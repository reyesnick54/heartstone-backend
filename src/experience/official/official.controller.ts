import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
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
import { CurrentOfficialContext } from './decorators/current-official-context.decorator';
import { OfficialAlertsResponseDto } from './dto/official-alerts-response.dto';
import {
  OfficialAppointmentDetailResponseDto,
  OfficialAppointmentsListResponseDto,
} from './dto/official-appointments-response.dto';
import { OfficialAvailableActionsResponseDto } from './dto/official-available-actions-response.dto';
import {
  OfficialCaseDetailResponseDto,
  OfficialCasesListResponseDto,
} from './dto/official-cases-response.dto';
import { OfficialMeResponseDto } from './dto/official-me-response.dto';
import { OfficialWorkQueueResponseDto } from './dto/official-work-queue-response.dto';
import { OfficialWorkspaceResponseDto } from './dto/official-workspace-response.dto';
import {
  OfficialExperienceGuard,
  RequiresSubstantiveOfficialAccess,
} from './guards/official-experience.guard';
import { OFFICIAL_EXPERIENCE_API_TAG } from './official-experience.constants';
import { OfficialAlertsService } from './services/official-alerts.service';
import { OfficialAppointmentsService } from './services/official-appointments.service';
import { OfficialAvailableActionsService } from './services/official-available-actions.service';
import { OfficialCasesService } from './services/official-cases.service';
import { OfficialMeService } from './services/official-me.service';
import { OfficialWorkQueueService } from './services/official-work-queue.service';
import { OfficialWorkspaceService } from './services/official-workspace.service';
import { type ResolvedOfficialContext } from './types/official-context.types';

@ApiTags(OFFICIAL_EXPERIENCE_API_TAG)
@ApiBearerAuth()
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Experience layer navigation and institutional workspace scope",
  authorityRequirement: "OfficialExperienceGuard for substantive routes; no authority from navigation",
  actorSource: "Session identity with resolved official or citizen context",
  primarySecurityInvariant: "Experience projections do not execute consequential government actions",
})
@Controller('experience/official')
@UseGuards(SessionAuthGuard, OfficialExperienceGuard)
export class OfficialController {
  constructor(
    private readonly meService: OfficialMeService,
    private readonly workspaceService: OfficialWorkspaceService,
    private readonly workQueueService: OfficialWorkQueueService,
    private readonly casesService: OfficialCasesService,
    private readonly availableActionsService: OfficialAvailableActionsService,
    private readonly alertsService: OfficialAlertsService,
    private readonly appointmentsService: OfficialAppointmentsService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Official identity and institutional context',
    description:
      'Returns authenticated identity summary, officeholder relationships, appointments, delegations, and technical capabilities. Does not assert universal authority.',
  })
  @ApiOkResponse({ type: OfficialMeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Not an official identity' })
  getMe(@CurrentOfficialContext() context: ResolvedOfficialContext): OfficialMeResponseDto {
    return this.meService.buildMeResponse(context);
  }

  @Get('workspace')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({
    summary: 'Official workspace dashboard summary',
    description:
      'Frontend-ready summary of assigned cases, department pool, reviews, SLA risks, and scoped alerts.',
  })
  @ApiOkResponse({ type: OfficialWorkspaceResponseDto })
  getWorkspace(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
  ): Promise<OfficialWorkspaceResponseDto> {
    return this.workspaceService.buildWorkspace(context);
  }

  @Get('work-queue')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({
    summary: 'Normalized official work queue',
    description: 'Prioritized queue entries derived from institutional scope and assignments.',
  })
  @ApiOkResponse({ type: OfficialWorkQueueResponseDto })
  getWorkQueue(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
  ): Promise<OfficialWorkQueueResponseDto> {
    return this.workQueueService.buildWorkQueue(context);
  }

  @Get('cases')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'List cases visible within official scope' })
  @ApiOkResponse({ type: OfficialCasesListResponseDto })
  listCases(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
  ): Promise<OfficialCasesListResponseDto> {
    return this.casesService.listCases(context);
  }

  @Get('cases/:id')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'Case detail within official scope' })
  @ApiOkResponse({ type: OfficialCaseDetailResponseDto })
  getCase(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
    @Param('id', ParseUUIDPipe) caseId: string,
  ): Promise<OfficialCaseDetailResponseDto> {
    return this.casesService.getCaseDetail(context, caseId);
  }

  @Get('cases/:id/available-actions')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({
    summary: 'Available UI actions for a case',
    description:
      'Server-evaluated action availability. Does not execute actions; execution endpoints re-evaluate authority.',
  })
  @ApiOkResponse({ type: OfficialAvailableActionsResponseDto })
  getAvailableActions(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
    @Param('id', ParseUUIDPipe) caseId: string,
  ): Promise<OfficialAvailableActionsResponseDto> {
    return this.availableActionsService.getAvailableActions(context, caseId);
  }

  @Get('alerts')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'Intelligence alerts scoped to the official' })
  @ApiOkResponse({ type: OfficialAlertsResponseDto })
  listAlerts(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
  ): Promise<OfficialAlertsResponseDto> {
    return this.alertsService.listAlerts(context);
  }

  @Get('appointments')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'List service appointments within official institutional scope' })
  @ApiOkResponse({ type: OfficialAppointmentsListResponseDto })
  listAppointments(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
  ): Promise<OfficialAppointmentsListResponseDto> {
    return this.appointmentsService.listAppointments(context);
  }

  @Get('appointments/:id')
  @RequiresSubstantiveOfficialAccess()
  @ApiOperation({ summary: 'Get service appointment detail within official scope' })
  @ApiOkResponse({ type: OfficialAppointmentDetailResponseDto })
  getAppointment(
    @CurrentOfficialContext() context: ResolvedOfficialContext,
    @Param('id', ParseUUIDPipe) appointmentId: string,
  ): Promise<OfficialAppointmentDetailResponseDto> {
    return this.appointmentsService.getAppointment(context, appointmentId);
  }
}
