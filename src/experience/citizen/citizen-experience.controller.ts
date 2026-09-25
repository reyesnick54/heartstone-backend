import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CancelServiceAppointmentDto } from '../../scheduling/service-appointments/dto/cancel-service-appointment.dto';
import { RescheduleServiceAppointmentDto } from '../../scheduling/service-appointments/dto/reschedule-service-appointment.dto';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CitizenActionsResponseDto } from './dto/citizen-action.dto';
import {
  CitizenApplicationDetailDto,
  CitizenApplicationsResponseDto,
} from './dto/citizen-application.dto';
import {
  CitizenAppointmentDetailDto,
  CitizenAppointmentsResponseDto,
} from './dto/citizen-appointment.dto';
import { CitizenCaseStatusResponseDto } from './dto/citizen-case-status-response.dto';
import { CitizenHomeResponseDto } from './dto/citizen-home-response.dto';
import { CitizenMeResponseDto } from './dto/citizen-me-response.dto';
import { CitizenActionCenterService } from './services/citizen-action-center.service';
import { CitizenApplicationsService } from './services/citizen-applications.service';
import { CitizenAppointmentsService } from './services/citizen-appointments.service';
import { CitizenCaseStatusService } from './services/citizen-case-status.service';
import { CitizenHomeService } from './services/citizen-home.service';
import { CitizenMeService } from './services/citizen-me.service';

@ApiTags('citizen-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Experience layer navigation and institutional workspace scope",
  authorityRequirement: "OfficialExperienceGuard for substantive routes; no authority from navigation",
  actorSource: "Session identity with resolved official or citizen context",
  primarySecurityInvariant: "Experience projections do not execute consequential government actions",
})
@Controller('experience/citizen')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenExperienceController {
  constructor(
    private readonly meService: CitizenMeService,
    private readonly homeService: CitizenHomeService,
    private readonly actionCenterService: CitizenActionCenterService,
    private readonly applicationsService: CitizenApplicationsService,
    private readonly caseStatusService: CitizenCaseStatusService,
    private readonly appointmentsService: CitizenAppointmentsService,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get aggregated citizen profile summary derived from authenticated session',
  })
  @ApiOkResponse({ type: CitizenMeResponseDto })
  getMe(@CurrentSession() session: SessionContextDto): Promise<CitizenMeResponseDto> {
    return this.meService.getMe(session);
  }

  @Get('home')
  @ApiOperation({ summary: 'Get frontend-ready citizen home dashboard summary counts' })
  @ApiOkResponse({ type: CitizenHomeResponseDto })
  getHome(@CurrentSession() session: SessionContextDto): Promise<CitizenHomeResponseDto> {
    return this.homeService.getHome(session.identityId);
  }

  @Get('actions')
  @ApiOperation({ summary: 'List actionable citizen tasks derived from existing platform state' })
  @ApiOkResponse({ type: CitizenActionsResponseDto })
  getActions(
    @CurrentSession() session: SessionContextDto,
    @Query() query: PaginationQueryDto,
  ): Promise<CitizenActionsResponseDto> {
    return this.actionCenterService.listActions(session.identityId, query);
  }

  @Get('applications')
  @ApiOperation({ summary: 'List applications accessible to the authenticated citizen' })
  @ApiOkResponse({ type: CitizenApplicationsResponseDto })
  listApplications(
    @CurrentSession() session: SessionContextDto,
    @Query() query: PaginationQueryDto,
  ): Promise<CitizenApplicationsResponseDto> {
    return this.applicationsService.listApplications(session.identityId, query);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get a single application detail for the authenticated citizen' })
  @ApiOkResponse({ type: CitizenApplicationDetailDto })
  getApplication(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CitizenApplicationDetailDto> {
    return this.applicationsService.getApplication(session.identityId, id);
  }

  @Get('cases/:id/status')
  @ApiOperation({ summary: 'Get applicant-safe case status for the authenticated citizen' })
  @ApiOkResponse({ type: CitizenCaseStatusResponseDto })
  getCaseStatus(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CitizenCaseStatusResponseDto> {
    return this.caseStatusService.getCaseStatus(session, id);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'List service appointments for the authenticated citizen' })
  @ApiOkResponse({ type: CitizenAppointmentsResponseDto })
  listAppointments(
    @CurrentSession() session: SessionContextDto,
    @Query() query: PaginationQueryDto,
  ): Promise<CitizenAppointmentsResponseDto> {
    return this.appointmentsService.listAppointments(session.identityId, query);
  }

  @Get('appointments/:id')
  @ApiOperation({ summary: 'Get a single service appointment for the authenticated citizen' })
  @ApiOkResponse({ type: CitizenAppointmentDetailDto })
  getAppointment(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CitizenAppointmentDetailDto> {
    return this.appointmentsService.getAppointment(session.identityId, id);
  }

  @Post('appointments/:id/confirm')
  @ApiOperation({ summary: 'Confirm a scheduled service appointment' })
  confirmAppointment(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.confirmAppointment(session.identityId, id);
  }

  @Post('appointments/:id/reschedule-request')
  @ApiOperation({ summary: 'Request rescheduling of a service appointment' })
  requestReschedule(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleServiceAppointmentDto,
  ) {
    return this.appointmentsService.requestReschedule(session.identityId, id, dto);
  }

  @Post('appointments/:id/cancel')
  @ApiOperation({ summary: 'Cancel a service appointment' })
  cancelAppointment(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelServiceAppointmentDto,
  ) {
    return this.appointmentsService.cancelAppointment(session.identityId, id, dto);
  }
}
