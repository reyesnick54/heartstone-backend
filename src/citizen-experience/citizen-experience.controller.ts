import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { CitizenCivilRegistryProjectionService } from './civil-registry/citizen-civil-registry-projection.service';
import { CitizenExperienceBoundaryService } from './common/citizen-experience-boundary.service';
import { CitizenCredentialsProjectionService } from './credentials/citizen-credentials-projection.service';
import { CitizenDocumentsProjectionService } from './documents/citizen-documents-projection.service';
import {
  CitizenCredentialSummaryDto,
  CitizenDocumentSummaryDto,
  CitizenMessageAcknowledgmentResponseDto,
  CitizenMessageSummaryDto,
  CitizenPaymentIntentResponseDto,
  CitizenPaymentSummaryDto,
  CitizenRenewalQueueItemDto,
} from './dto/citizen-experience-response.dto';
import { CitizenMessagesProjectionService } from './messages/citizen-messages-projection.service';
import { CitizenPaymentsProjectionService } from './payments/citizen-payments-projection.service';
import { CitizenRenewalsProjectionService } from './renewals/citizen-renewals-projection.service';

@ApiTags('citizen-experience')
@Controller('experience/citizen')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenExperienceController {
  constructor(
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
