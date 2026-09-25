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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CancelServiceAppointmentDto } from '../../scheduling/service-appointments/dto/cancel-service-appointment.dto';
import { RescheduleServiceAppointmentDto } from '../../scheduling/service-appointments/dto/reschedule-service-appointment.dto';
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
import {
  CitizenCredentialSummaryDto,
  CitizenDocumentSummaryDto,
  CitizenMessageAcknowledgmentResponseDto,
  CitizenMessageSummaryDto,
  CitizenPaymentIntentResponseDto,
  CitizenPaymentSummaryDto,
  CitizenRenewalQueueItemDto,
} from './dto/citizen-experience-response.dto';
import { CitizenHomeResponseDto } from './dto/citizen-home-response.dto';
import { CitizenMeResponseDto } from './dto/citizen-me-response.dto';
import { CitizenCivilRegistryProjectionService } from './projections/civil-registry/citizen-civil-registry-projection.service';
import { CitizenExperienceBoundaryService } from './projections/common/citizen-experience-boundary.service';
import { CitizenCredentialsProjectionService } from './projections/credentials/citizen-credentials-projection.service';
import { CitizenDocumentsProjectionService } from './projections/documents/citizen-documents-projection.service';
import { CitizenMessagesProjectionService } from './projections/messages/citizen-messages-projection.service';
import { CitizenPaymentsProjectionService } from './projections/payments/citizen-payments-projection.service';
import { CitizenRenewalsProjectionService } from './projections/renewals/citizen-renewals-projection.service';
import { CitizenActionCenterService } from './services/citizen-action-center.service';
import { CitizenApplicationsService } from './services/citizen-applications.service';
import { CitizenAppointmentsService } from './services/citizen-appointments.service';
import { CitizenCaseStatusService } from './services/citizen-case-status.service';
import { CitizenHomeService } from './services/citizen-home.service';
import { CitizenMeService } from './services/citizen-me.service';

@ApiTags('citizen-experience')
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
    private readonly boundary: CitizenExperienceBoundaryService,
    private readonly documents: CitizenDocumentsProjectionService,
    private readonly credentials: CitizenCredentialsProjectionService,
    private readonly payments: CitizenPaymentsProjectionService,
    private readonly messages: CitizenMessagesProjectionService,
    private readonly renewals: CitizenRenewalsProjectionService,
    private readonly civilRegistry: CitizenCivilRegistryProjectionService,
  ) {}

  @Get('boundary')
  @ApiOperation({ summary: 'Citizen experience boundary disclaimer' })
  getBoundaryDisclaimer() {
    return this.boundary.boundaryDisclaimer();
  }

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

  @Get('documents')
  @ApiOperation({ summary: 'List citizen-accessible documents (projection)' })
  @ApiResponse({ status: 200, type: [CitizenDocumentSummaryDto] })
  listDocuments(@CurrentSession() session: SessionContextDto) {
    return this.documents.listDocuments(session.identityId);
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get citizen-accessible document detail (projection)' })
  @ApiResponse({ status: 200, type: CitizenDocumentSummaryDto })
  getDocument(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.getDocument(session.identityId, id);
  }

  @Get('credentials')
  @ApiOperation({ summary: 'List citizen-held government credentials/instruments (projection)' })
  @ApiResponse({ status: 200, type: [CitizenCredentialSummaryDto] })
  listCredentials(@CurrentSession() session: SessionContextDto) {
    return this.credentials.listCredentials(session.identityId);
  }

  @Get('credentials/:id')
  @ApiOperation({ summary: 'Get citizen credential/instrument detail (projection)' })
  @ApiResponse({ status: 200, type: CitizenCredentialSummaryDto })
  getCredential(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.credentials.getCredential(session.identityId, id);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List citizen payment records (projection)' })
  @ApiResponse({ status: 200, type: [CitizenPaymentSummaryDto] })
  listPayments(@CurrentSession() session: SessionContextDto) {
    return this.payments.listPayments(session.identityId);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get citizen payment record detail (projection)' })
  getPayment(@CurrentSession() session: SessionContextDto, @Param('id', ParseUUIDPipe) id: string) {
    return this.payments.getPayment(session.identityId, id);
  }

  @Post('payments/:invoiceId/intents')
  @ApiOperation({
    summary: 'Create payment intent for a citizen-accessible invoice',
    description:
      'Orchestrates PaymentIntentService. Payment settlement does not alter case or decision status.',
  })
  @ApiResponse({ status: 201, type: CitizenPaymentIntentResponseDto })
  createPaymentIntent(
    @CurrentSession() session: SessionContextDto,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
  ) {
    return this.payments.createPaymentIntent(session.identityId, invoiceId);
  }

  @Get('messages')
  @ApiOperation({ summary: 'List portal-safe government communications (projection)' })
  @ApiResponse({ status: 200, type: [CitizenMessageSummaryDto] })
  listMessages(@CurrentSession() session: SessionContextDto) {
    return this.messages.listMessages(session.identityId);
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get portal-safe government communication detail (projection)' })
  getMessage(@CurrentSession() session: SessionContextDto, @Param('id', ParseUUIDPipe) id: string) {
    return this.messages.getMessage(session.identityId, id);
  }

  @Post('messages/:id/acknowledge')
  @ApiOperation({
    summary: 'Acknowledge a deliverable portal communication where rules permit',
    description: 'Records CommunicationReceipt and security audit event.',
  })
  @ApiResponse({ status: 201, type: CitizenMessageAcknowledgmentResponseDto })
  acknowledgeMessage(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.messages.acknowledgeMessage(session.identityId, id, session.sessionId);
  }

  @Get('renewals')
  @ApiOperation({
    summary: 'Derived renewal queue from authoritative instrument lifecycle data',
  })
  @ApiResponse({ status: 200, type: [CitizenRenewalQueueItemDto] })
  listRenewals(@CurrentSession() session: SessionContextDto) {
    return this.renewals.listRenewals(session.identityId);
  }

  @Get('civil-status')
  @ApiOperation({ summary: 'Citizen civil status projection (entitlement-scoped)' })
  getCivilStatus(@CurrentSession() session: SessionContextDto) {
    return this.civilRegistry.getCivilStatus(session.identityId);
  }

  @Get('vital-records')
  @ApiOperation({ summary: 'List entitled vital records (projection)' })
  listVitalRecords(@CurrentSession() session: SessionContextDto) {
    return this.civilRegistry.listVitalRecords(session.identityId);
  }

  @Get('vital-records/:id')
  @ApiOperation({ summary: 'Get entitled vital record detail (projection)' })
  getVitalRecord(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.civilRegistry.getVitalRecord(session.identityId, id);
  }

  @Get('certificates')
  @ApiOperation({ summary: 'List civil certificates for entitled records' })
  listCivilCertificates(@CurrentSession() session: SessionContextDto) {
    return this.civilRegistry.listCertificates(session.identityId);
  }

  @Get('civil-registry/actions')
  @ApiOperation({
    summary: 'Discover governed civil registry GovernmentService actions',
    description:
      'Surfaces template service slugs for certificate requests and registrations — no direct record download bypass.',
  })
  listCivilRegistryActions() {
    return this.civilRegistry.listCivilRegistryActions();
  }
}
