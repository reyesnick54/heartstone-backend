import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentSession } from '../../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../../security/route-class.enum';
import { CitizenMessagesProjectionService } from '../projections/messages/citizen-messages-projection.service';
import { CitizenApplicationDocumentsService } from './citizen-application-documents.service';
import { CitizenCommunicationPreferencesService } from './citizen-communication-preferences.service';
import { CitizenProfileCorrectionsService } from './citizen-profile-corrections.service';
import { CitizenReviewRequestsService } from './citizen-review-requests.service';
import {
  CitizenApplicationDocumentUploadDto,
  CitizenCommunicationPreferencesDto,
  CitizenMessageReadResponseDto,
  CitizenProfileCorrectionListDto,
  CitizenProfileCorrectionRequestDto,
  CitizenReviewOverviewDto,
  CitizenReviewRequestDto,
  CreateCitizenProfileCorrectionDto,
  CreateCitizenReviewRequestDto,
  UpdateCitizenCommunicationPreferencesDto,
  UploadCitizenApplicationDocumentDto,
} from './dto/citizen-self-service.dto';

/**
 * Citizen self-service writes. Every route acts only on the signed-in identity: no route takes
 * an identity or actor id from the client, and another person's case, application, message or
 * document is reported as not found. None of these routes grants a role, authority,
 * verification, approval or issuance.
 */
@ApiTags('citizen-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
  authenticationRequired: true,
  scopeRequirement: 'Cases, applications, messages and profile owned by the signed-in citizen',
  authorityRequirement:
    'None conferred: requests are recorded for authorized officials; preferences steer optional delivery only',
  actorSource: 'Session identity only; client-supplied identity fields are rejected',
  primarySecurityInvariant:
    'A citizen request is not a decision: filing, uploading or asking never approves, verifies or changes an official record',
})
@Controller('experience/citizen')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenSelfServiceController {
  constructor(
    private readonly reviewRequests: CitizenReviewRequestsService,
    private readonly profileCorrections: CitizenProfileCorrectionsService,
    private readonly communicationPreferences: CitizenCommunicationPreferencesService,
    private readonly applicationDocuments: CitizenApplicationDocumentsService,
    private readonly messages: CitizenMessagesProjectionService,
  ) {}

  @Get('cases/:caseId/review-requests')
  @ApiOperation({
    summary: 'Reviewable decisions, available review routes and filed review requests for a case',
  })
  @ApiOkResponse({ type: CitizenReviewOverviewDto })
  getReviewOverview(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
  ): Promise<CitizenReviewOverviewDto> {
    return this.reviewRequests.getOverview(session.identityId, caseId);
  }

  @Post('cases/:caseId/review-requests')
  @ApiOperation({
    summary: 'Request review of a decision on your own case',
    description:
      'Files a redress matter on a review route configured for the service. Duplicate filings for the same decision return 409. Filing does not suspend or reverse the decision unless the route provides for that.',
  })
  @ApiCreatedResponse({ type: CitizenReviewRequestDto })
  fileReviewRequest(
    @CurrentSession() session: SessionContextDto,
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: CreateCitizenReviewRequestDto,
  ): Promise<CitizenReviewRequestDto> {
    return this.reviewRequests.fileReviewRequest(session, caseId, dto);
  }

  @Get('profile/correction-requests')
  @ApiOperation({ summary: 'List your profile correction requests' })
  @ApiOkResponse({ type: CitizenProfileCorrectionListDto })
  listProfileCorrections(
    @CurrentSession() session: SessionContextDto,
  ): Promise<CitizenProfileCorrectionListDto> {
    return this.profileCorrections.list(session.identityId);
  }

  @Post('profile/correction-requests')
  @ApiOperation({
    summary: 'Ask an official to correct your profile record',
    description:
      'Records a correction request for review. Your record is not changed until an authorized official approves and implements the correction.',
  })
  @ApiCreatedResponse({ type: CitizenProfileCorrectionRequestDto })
  requestProfileCorrection(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CreateCitizenProfileCorrectionDto,
  ): Promise<CitizenProfileCorrectionRequestDto> {
    return this.profileCorrections.request(session, dto);
  }

  @Get('preferences/communications')
  @ApiOperation({ summary: 'Get your communication preferences' })
  @ApiOkResponse({ type: CitizenCommunicationPreferencesDto })
  getCommunicationPreferences(
    @CurrentSession() session: SessionContextDto,
  ): Promise<CitizenCommunicationPreferencesDto> {
    return this.communicationPreferences.get(session.identityId);
  }

  @Put('preferences/communications')
  @ApiOperation({
    summary: 'Update your communication preferences',
    description:
      'Applies directly. Channels not listed are left unchanged. Legally required notices are delivered regardless.',
  })
  @ApiOkResponse({ type: CitizenCommunicationPreferencesDto })
  updateCommunicationPreferences(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: UpdateCitizenCommunicationPreferencesDto,
  ): Promise<CitizenCommunicationPreferencesDto> {
    return this.communicationPreferences.update(session, dto);
  }

  @Post('applications/:id/documents')
  @ApiOperation({
    summary: 'Upload a supporting document to your own application',
    description:
      'Allowed while the application is a draft or its case is waiting for you. The file is hashed and malware-scanned; it is not verified. Re-uploading the same file returns the first upload.',
  })
  @ApiCreatedResponse({ type: CitizenApplicationDocumentUploadDto })
  uploadApplicationDocument(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() dto: UploadCitizenApplicationDocumentDto,
  ): Promise<CitizenApplicationDocumentUploadDto> {
    return this.applicationDocuments.upload(session, applicationId, dto);
  }

  @Post('messages/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record that you have read a portal message',
    description:
      'Idempotent. Reading is not legal acknowledgment; use the acknowledge route where a notice requires it.',
  })
  @ApiOkResponse({ type: CitizenMessageReadResponseDto })
  markMessageRead(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CitizenMessageReadResponseDto> {
    return this.messages.markMessageRead(session.identityId, id, session.sessionId);
  }
}
