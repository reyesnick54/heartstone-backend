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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AutomationChallengeDispositionOutcome,
  ComplaintClassificationType,
  ComplaintClosureReason,
  DeadlineExtensionOutcome,
  InterimReliefOutcome,
  RedressDecisionOutcome,
  RedressNoticeType,
  RedressRouteCategory,
  RedressStandingOutcome,
  RedressTimelinessOutcome,
} from '@prisma/client';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { AutomationChallengeService } from './automation/automation-challenge.service';
import { ClarificationService } from './clarification/clarification.service';
import { RedressAccessService } from './common/redress-access.service';
import { RedressBoundaryService } from './common/redress-boundary.service';
import { ComplaintService } from './complaints/complaint.service';
import { AdministrativeCorrectionService } from './correction/administrative-correction.service';
import { RedressDecisionService } from './decisions/redress-decision.service';
import { ExternalReviewService } from './external/external-review.service';
import { DeadlineExtensionService } from './filings/deadline-extension.service';
import { RedressFilingService } from './filings/redress-filing.service';
import { RedressStandingService } from './filings/redress-standing.service';
import { RedressTimelinessService } from './filings/redress-timeliness.service';
import { RedressImplementationService } from './implementation/redress-implementation.service';
import { InterimReliefService } from './interim/interim-relief.service';
import { RedressMatterService } from './matters/redress-matter.service';
import { RedressNoticeService } from './notices/redress-notice.service';
import { InternalReviewService } from './review/internal-review.service';
import { ReconsiderationService } from './review/reconsideration.service';
import { ReviewAssignmentService } from './review/review-assignment.service';
import { ReviewSnapshotService } from './review/review-snapshot.service';
import { ReviewerIndependenceService } from './review/reviewer-independence.service';
import { RedressRouteCatalogService } from './routing/redress-route-catalog.service';

@ApiTags('redress')
@Controller('redress')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class RedressController {
  constructor(
    private readonly boundary: RedressBoundaryService,
    private readonly access: RedressAccessService,
    private readonly routeCatalog: RedressRouteCatalogService,
    private readonly matters: RedressMatterService,
    private readonly filings: RedressFilingService,
    private readonly standing: RedressStandingService,
    private readonly timeliness: RedressTimelinessService,
    private readonly deadlineExtensions: DeadlineExtensionService,
    private readonly complaints: ComplaintService,
    private readonly corrections: AdministrativeCorrectionService,
    private readonly clarifications: ClarificationService,
    private readonly automation: AutomationChallengeService,
    private readonly reviewAssignments: ReviewAssignmentService,
    private readonly reviewerIndependence: ReviewerIndependenceService,
    private readonly reviewSnapshots: ReviewSnapshotService,
    private readonly reconsideration: ReconsiderationService,
    private readonly internalReview: InternalReviewService,
    private readonly externalReview: ExternalReviewService,
    private readonly decisions: RedressDecisionService,
    private readonly interimRelief: InterimReliefService,
    private readonly implementation: RedressImplementationService,
    private readonly notices: RedressNoticeService,
  ) {}

  @Get('routes')
  @ApiOperation({ summary: 'List applicable redress routes' })
  listRoutes(
    @Query('category') category?: RedressRouteCategory,
    @Query('institutionId') institutionId?: string,
    @Query('jurisdictionId') jurisdictionId?: string,
    @Query('matterTypeCode') matterTypeCode?: string,
  ) {
    return this.routeCatalog.listApplicableRoutes({
      category,
      institutionId,
      jurisdictionId,
      matterTypeCode,
    });
  }

  @Post('matters')
  @ApiOperation({ summary: 'Open a redress matter linked to case or decision' })
  createMatter(
    @CurrentSession() session: SessionContextDto,
    @Body()
    dto: {
      caseId?: string;
      masterAdministrativeFileId?: string;
      challengedDecisionId?: string;
      challengedInstrumentId?: string;
      representativeAuthorityId?: string;
      routeVersionId?: string;
    },
  ) {
    this.boundary.rejectClientProtectedFields(dto);
    return this.matters.createMatter({
      filerIdentityId: session.identityId,
      ...dto,
    });
  }

  @Get('matters/:id')
  @ApiOperation({ summary: 'Fetch a redress matter' })
  async getMatter(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.access.assertMatterAccess(id, { identityId: session.identityId });
    return this.matters.findById(id);
  }

  @Post('filings')
  @ApiOperation({ summary: 'Create a draft redress filing' })
  createFiling(
    @CurrentSession() session: SessionContextDto,
    @Body()
    dto: {
      matterId: string;
      routeVersionId: string;
      representativeAuthorityId?: string;
      groundsReference?: string;
      summary?: string;
      requestedRouteCategory?: RedressRouteCategory;
      contentReference?: string;
      contentHash?: string;
    },
  ) {
    this.boundary.rejectClientProtectedFields(dto);
    return this.filings.createDraft({
      filerIdentityId: session.identityId,
      ...dto,
    });
  }

  @Post('filings/:id/submit')
  @ApiOperation({ summary: 'Submit a draft filing for intake' })
  submitFiling(@Param('id', ParseUUIDPipe) id: string) {
    return this.filings.submitFiling(id);
  }

  @Post('filings/:id/classify')
  @ApiOperation({ summary: 'Classify filing route category' })
  classifyFiling(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: { classifiedRouteCategory: RedressRouteCategory; rejectMislabeled?: boolean },
  ) {
    this.boundary.rejectClientProtectedFields(dto);
    return this.filings.classifyFiling({
      filingId: id,
      ...dto,
    });
  }

  @Post('standing/assess')
  @ApiOperation({ summary: 'Assess standing with authority evaluation' })
  assessStanding(
    @CurrentSession() session: SessionContextDto,
    @Body()
    dto: {
      matterId: string;
      assessorOfficeholderId: string;
      functionAuthorityRecordId: string;
      appointmentId?: string;
      delegationId?: string;
      outcome: RedressStandingOutcome;
      explanation?: string;
    },
  ) {
    this.boundary.rejectClientProtectedFields(dto);
    return this.standing.assessStanding({
      assessorIdentityId: session.identityId,
      ...dto,
    });
  }

  @Post('timeliness/assess')
  @ApiOperation({ summary: 'Assess filing timeliness with authority evaluation' })
  assessTimeliness(
    @CurrentSession() session: SessionContextDto,
    @Body()
    dto: {
      matterId: string;
      assessorOfficeholderId: string;
      functionAuthorityRecordId: string;
      appointmentId?: string;
      delegationId?: string;
      filingDeadline: string;
      actualFilingDate: string;
      outcome: RedressTimelinessOutcome;
      explanation?: string;
    },
  ) {
    this.boundary.rejectClientProtectedFields(dto);
    return this.timeliness.assessTimeliness({
      assessorIdentityId: session.identityId,
      matterId: dto.matterId,
      assessorOfficeholderId: dto.assessorOfficeholderId,
      functionAuthorityRecordId: dto.functionAuthorityRecordId,
      appointmentId: dto.appointmentId,
      delegationId: dto.delegationId,
      filingDeadline: new Date(dto.filingDeadline),
      actualFilingDate: new Date(dto.actualFilingDate),
      outcome: dto.outcome,
      explanation: dto.explanation,
    });
  }

  @Post('deadline-extensions')
  @ApiOperation({ summary: 'Request a filing deadline extension' })
  requestExtension(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: { matterId: string; reason: string },
  ) {
    return this.deadlineExtensions.requestExtension({
      requestedByIdentityId: session.identityId,
      ...dto,
    });
  }

  @Post('deadline-extensions/:id/decide')
  @ApiOperation({ summary: 'Decide a deadline extension request' })
  decideExtension(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      deciderOfficeholderId: string;
      functionAuthorityRecordId: string;
      appointmentId?: string;
      delegationId?: string;
      outcome: DeadlineExtensionOutcome;
    },
  ) {
    return this.deadlineExtensions.decideExtension({
      requestId: id,
      deciderIdentityId: session.identityId,
      ...dto,
    });
  }

  @Post('complaints/classify')
  @ApiOperation({ summary: 'Classify a complaint matter' })
  classifyComplaint(
    @CurrentSession() session: SessionContextDto,
    @Body()
    dto: {
      matterId: string;
      classificationType: ComplaintClassificationType;
      classifiedByOfficeholderId?: string;
      requestedRouteCategory?: RedressRouteCategory;
      explanation?: string;
    },
  ) {
    return this.complaints.classifyComplaint({
      classifiedByIdentityId: session.identityId,
      ...dto,
    });
  }

  @Post('complaints/investigations')
  @ApiOperation({ summary: 'Start complaint investigation' })
  startInvestigation(
    @Body()
    dto: {
      matterId: string;
      classificationId: string;
      investigatorIdentityId?: string;
      investigatorOfficeholderId?: string;
    },
  ) {
    return this.complaints.startInvestigation(dto);
  }

  @Post('complaints/investigations/:id/close')
  @ApiOperation({ summary: 'Close complaint investigation' })
  closeComplaint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { reason: ComplaintClosureReason },
  ) {
    return this.complaints.closeComplaint({ investigationId: id, ...dto });
  }

  @Post('corrections')
  @ApiOperation({ summary: 'Create nonsubstantive administrative correction' })
  createCorrection(
    @Body()
    dto: {
      matterId: string;
      originalNoticeReference: string;
      errorDescription: string;
    },
  ) {
    this.boundary.rejectClientProtectedFields(dto);
    return this.corrections.createCorrection(dto);
  }

  @Post('clarifications')
  @ApiOperation({ summary: 'Request clarification without substantive change' })
  createClarification(@Body() dto: { matterId: string; questionSummary: string }) {
    this.boundary.rejectClientProtectedFields(dto);
    return this.clarifications.createRequest(dto);
  }

  @Post('automation/challenges')
  @ApiOperation({ summary: 'File an AI/automation challenge' })
  createAutomationChallenge(
    @Body()
    dto: {
      matterId: string;
      challengedOutputReference: string;
      challengedInputReference?: string;
    },
  ) {
    return this.automation.createChallenge(dto);
  }

  @Post('automation/challenges/:id/disposition')
  @ApiOperation({ summary: 'Record human disposition of automation challenge' })
  dispositionAutomationChallenge(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      deciderOfficeholderId: string;
      functionAuthorityRecordId: string;
      appointmentId?: string;
      delegationId?: string;
      outcome: AutomationChallengeDispositionOutcome;
      explanation?: string;
    },
  ) {
    return this.automation.dispositionChallenge({
      challengeId: id,
      deciderIdentityId: session.identityId,
      ...dto,
    });
  }

  @Post('review/assignments')
  @ApiOperation({ summary: 'Assign an independent reviewer' })
  assignReviewer(
    @Body()
    dto: {
      matterId: string;
      reviewerIdentityId: string;
      reviewerOfficeholderId: string;
      appointmentId?: string;
      originalDecisionMakerOfficeholderId?: string;
    },
  ) {
    return this.reviewAssignments.assignReviewer(dto);
  }

  @Post('review/assignments/:id/independence')
  @ApiOperation({ summary: 'Assess reviewer independence' })
  assessIndependence(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      originalDecisionMakerBlocked?: boolean;
      priorInvolvementBlocked?: boolean;
      conflictBlocked?: boolean;
      explanation?: string;
    },
  ) {
    return this.reviewerIndependence.assessIndependence({
      assignmentId: id,
      assessedByIdentityId: session.identityId,
      ...dto,
    });
  }

  @Post('review/snapshots')
  @ApiOperation({ summary: 'Pin original review record snapshot' })
  pinSnapshot(
    @Body()
    dto: {
      matterId: string;
      snapshotReference: string;
      originalDecisionReference?: string;
    },
  ) {
    return this.reviewSnapshots.pinSnapshot(dto);
  }

  @Post('reconsideration')
  @ApiOperation({ summary: 'Open reconsideration proceeding' })
  openReconsideration(@Body() dto: { matterId: string; snapshotId?: string }) {
    return this.reconsideration.openProceeding(dto);
  }

  @Post('internal-review')
  @ApiOperation({ summary: 'Open internal administrative review' })
  openInternalReview(@Body() dto: { matterId: string }) {
    return this.internalReview.openReview(dto);
  }

  @Post('external/referrals')
  @ApiOperation({ summary: 'Create external review referral' })
  createExternalReferral(@Body() dto: { matterId: string; externalAuthorityLabel: string }) {
    return this.externalReview.createReferral(dto);
  }

  @Post('decisions')
  @ApiOperation({ summary: 'Record redress disposition with HEAR_REVIEW authority' })
  recordDecision(
    @CurrentSession() session: SessionContextDto,
    @Body()
    dto: {
      matterId: string;
      outcome: RedressDecisionOutcome;
      deciderOfficeholderId: string;
      functionAuthorityRecordId: string;
      appointmentId?: string;
      delegationId?: string;
      isRecommendation?: boolean;
      isFinalDisposition?: boolean;
    },
  ) {
    this.boundary.rejectClientProtectedFields(dto);
    return this.decisions.recordDecision({
      deciderIdentityId: session.identityId,
      ...dto,
    });
  }

  @Post('interim-relief')
  @ApiOperation({ summary: 'Request interim relief / stay' })
  requestInterimRelief(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: { matterId: string; scopeDescription?: string },
  ) {
    return this.interimRelief.requestRelief({
      requestedByIdentityId: session.identityId,
      ...dto,
    });
  }

  @Post('interim-relief/:id/decide')
  @ApiOperation({ summary: 'Decide interim relief request' })
  decideInterimRelief(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    dto: {
      deciderOfficeholderId: string;
      functionAuthorityRecordId: string;
      appointmentId?: string;
      delegationId?: string;
      outcome: InterimReliefOutcome;
      challengedInstrumentId?: string;
      reviewReferenceId?: string;
    },
  ) {
    return this.interimRelief.decideRelief({
      requestId: id,
      deciderIdentityId: session.identityId,
      ...dto,
    });
  }

  @Post('implementation/plans')
  @ApiOperation({ summary: 'Create redress implementation plan' })
  createImplementationPlan(
    @Body()
    dto: {
      matterId: string;
      decisionId: string;
      actions: {
        actionType: string;
        actionSummary: string;
        phase8Controlled?: boolean;
        phase9Controlled?: boolean;
      }[];
    },
  ) {
    return this.implementation.createPlan(dto);
  }

  @Post('notices')
  @ApiOperation({ summary: 'Issue a redress notice' })
  issueNotice(
    @Body()
    dto: {
      matterId: string;
      noticeType: RedressNoticeType;
      noticeReference: string;
      recipientIdentityId?: string;
      isPrivileged?: boolean;
    },
  ) {
    this.boundary.rejectClientProtectedFields(dto);
    return this.notices.issueNotice(dto);
  }

  @Get('matters/:id/notices')
  @ApiOperation({ summary: 'List notices for a matter' })
  async listNotices(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.access.assertMatterAccess(id, { identityId: session.identityId });
    return this.notices.listNoticesForMatter(id);
  }
}
