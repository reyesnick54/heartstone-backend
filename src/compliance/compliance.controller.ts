import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { type SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ComplianceBoundaryService } from './compliance-boundary.service';
import { ComplianceEscalationService } from './compliance-escalation.service';
import { ComplianceMatterService } from './compliance-matter.service';
import { ComplianceProjectionService } from './compliance-projection.service';
import { ComplianceReviewService } from './compliance-review.service';
import { ComplianceSubmissionService } from './compliance-submission.service';
import { ContinuingObligationService } from './continuing-obligation.service';
import { CorrectiveActionService } from './corrective-action.service';
import { EmergencyInterimActionService } from './emergency-interim-action.service';
import { EnforcementReferralService } from './enforcement-referral.service';
import { InspectionExecutionService } from './inspection-execution.service';
import { InspectionFindingService } from './inspection-finding.service';
import { InspectionPlanningService } from './inspection-planning.service';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ObligationStatusChangeActor } from '@prisma/client';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ComplianceBoundaryService } from './common/compliance-boundary.service';
import { CreateComplianceMatterDto } from './dto/create-compliance-matter.dto';
import { CreateObligationFromConditionDto } from './dto/create-obligation-from-condition.dto';
import { ExtendObligationDeadlineDto } from './dto/extend-obligation-deadline.dto';
import { FinalizeComplianceReviewDto } from './dto/finalize-compliance-review.dto';
import { ReceiveComplianceSubmissionDto } from './dto/receive-compliance-submission.dto';
import { RecordObligationStatusDto } from './dto/record-obligation-status.dto';
import { RequestSubmissionCorrectionDto } from './dto/request-submission-correction.dto';
import { ComplianceMatterService } from './matters/compliance-matter.service';
import { ContinuingObligationService } from './obligations/continuing-obligation.service';
import { ComplianceReviewService } from './reviews/compliance-review.service';
import { ComplianceSubmissionService } from './submissions/compliance-submission.service';

@ApiTags('compliance')
@Controller('compliance')
@UseGuards(SessionAuthGuard)
export class ComplianceController {
  constructor(
    private readonly boundary: ComplianceBoundaryService,
    private readonly matters: ComplianceMatterService,
    private readonly obligations: ContinuingObligationService,
    private readonly submissions: ComplianceSubmissionService,
    private readonly reviews: ComplianceReviewService,
    private readonly planning: InspectionPlanningService,
    private readonly execution: InspectionExecutionService,
    private readonly findings: InspectionFindingService,
    private readonly correctiveActions: CorrectiveActionService,
    private readonly escalations: ComplianceEscalationService,
    private readonly referrals: EnforcementReferralService,
    private readonly emergencyActions: EmergencyInterimActionService,
    private readonly projections: ComplianceProjectionService,
  ) {}

  @Post('matters/open')
  @ApiOperation({ summary: 'Open a compliance matter linked to case, instrument, or master file' })
  openMatter(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.matters.open(body as never);
  }

  @Post('obligations')
  @ApiOperation({ summary: 'Create a continuing obligation under a compliance matter' })
  createObligation(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.obligations.create(body as never);
  }

  @Post('submissions')
  @ApiOperation({
    summary: 'Record holder compliance submission (receipt does not satisfy obligation)',
  })
  recordSubmission(
    @CurrentSession() session: SessionContextDto,
    @Body() body: Record<string, unknown>,
  ) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.submissions.recordSubmission({
      ...(body as object),
      submittedByIdentityId:
        (body.submittedByIdentityId as string | undefined) ?? session.identityId,
    } as never);
  }

  @Post('reviews')
  @ApiOperation({ summary: 'Institutional review of compliance submission' })
  reviewSubmission(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.reviews.reviewSubmission(body as never);
  }

  @Post('inspection/plans')
  @ApiOperation({ summary: 'Create inspection plan' })
  createInspectionPlan(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.planning.createPlan(body as never);
  }

  @Post('inspection/assignments')
  @ApiOperation({ summary: 'Assign inspector with INSPECT authority evaluation' })
  assignInspector(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.planning.assignInspector(body as never);
  }

  @Post('inspection/sessions/start')
  @ApiOperation({
    summary: 'Start inspection session, optionally linking Phase 7 inspection record',
  })
  startInspectionSession(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.execution.startSession(body);
  }

  @Post('inspection/observations')
  @ApiOperation({ summary: 'Record inspection observation (not a finding)' })
  recordObservation(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.execution.recordObservation(body as never);
  }

  @Post('inspection/findings')
  @ApiOperation({ summary: 'Record institutional inspection finding' })
  recordFinding(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.findings.recordFinding(body as never);
  }

  @Post('inspection/findings/close')
  @ApiOperation({ summary: 'Close inspection finding (holder cannot self-close)' })
  closeFinding(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.findings.closeFinding(body as never);
  }

  @Post('corrective-action/plans')
  @ApiOperation({ summary: 'Create corrective action plan for finding or matter' })
  createCorrectiveActionPlan(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.correctiveActions.createPlan(body as never);
  }

  @Post('corrective-action/verify')
  @ApiOperation({ summary: 'Verify corrective action item (holder cannot self-verify)' })
  verifyCorrectiveAction(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.correctiveActions.verifyItem(body as never);
  }

  @Post('escalations')
  @ApiOperation({ summary: 'Escalate compliance matter or noncompliance finding' })
  escalate(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.escalations.escalate(body as never);
  }

  @Post('enforcement/referrals')
  @ApiOperation({ summary: 'Prepare enforcement referral (does not suspend instrument)' })
  referEnforcement(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.referrals.refer(body as never);
  }

  @Post('emergency/interim-actions')
  @ApiOperation({ summary: 'Record emergency interim action without instrument suspension' })
  recordEmergencyAction(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.emergencyActions.record(body as never);
  }

  @Post('projections')
  @ApiOperation({ summary: 'Record informational compliance status projection' })
  projectStatus(@Body() body: Record<string, unknown>) {
    this.boundary.assertClientPayloadDoesNotSetProtectedFields(body);
    return this.projections.projectStatus(body as never);
@ApiBearerAuth()
export class ComplianceController {
  constructor(
    private readonly complianceMatters: ComplianceMatterService,
    private readonly obligations: ContinuingObligationService,
    private readonly submissions: ComplianceSubmissionService,
    private readonly reviews: ComplianceReviewService,
    private readonly boundary: ComplianceBoundaryService,
  ) {}

  @Post('matters')
  @ApiOperation({ summary: 'Open compliance monitoring for an issued instrument' })
  async createMatter(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CreateComplianceMatterDto,
  ) {
    return this.complianceMatters.openFromIssuedInstrument({
      masterAdministrativeFileId: dto.masterAdministrativeFileId,
      officialInstrumentId: dto.officialInstrumentId,
      responsibleInstitutionId: dto.responsibleInstitutionId,
      responsibleDepartmentId: dto.responsibleDepartmentId,
      caseId: dto.caseId,
      holderIdentityId: dto.holderIdentityId ?? session.identityId,
      holderOrganizationId: dto.holderOrganizationId,
    });
  }

  @Get('matters/:id')
  @ApiOperation({ summary: 'Fetch a compliance matter with obligations' })
  async getMatter(@Param('id', ParseUUIDPipe) id: string) {
    return this.complianceMatters.findById(id);
  }

  @Get('matters/:id/obligations')
  @ApiOperation({ summary: 'List continuing obligations for a compliance matter' })
  async listObligations(@Param('id', ParseUUIDPipe) id: string) {
    return this.obligations.listForMatter(id);
  }

  @Post('obligations/from-condition')
  @ApiOperation({ summary: 'Create a controlled continuing obligation from an approved condition' })
  async createFromCondition(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CreateObligationFromConditionDto,
  ) {
    this.boundary.rejectClientProtectedObligationFields(dto as unknown as Record<string, unknown>);
    return this.obligations.createFromApprovedCondition({
      complianceMatterId: dto.complianceMatterId,
      sourceDecisionConditionId: dto.sourceDecisionConditionId,
      sourceInstrumentVersionId: dto.sourceInstrumentVersionId,
      obligationCode: dto.obligationCode,
      responsibleParty: dto.responsibleParty,
      obligationType: dto.obligationType,
      startDate: new Date(dto.startDate),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      recurrenceConfiguration: dto.recurrenceConfiguration,
      evidenceStandard: dto.evidenceStandard,
      reviewingOfficeId: dto.reviewingOfficeId,
      functionAuthorityRecordId: dto.functionAuthorityRecordId,
      noncomplianceConsequenceReference: dto.noncomplianceConsequenceReference,
      exceptionProcedureReference: dto.exceptionProcedureReference,
      actorIdentityId: session.identityId,
    });
  }

  @Post('obligations/:id/status')
  @ApiOperation({ summary: 'Record administrative obligation status with audit history' })
  async recordStatus(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordObligationStatusDto,
  ) {
    return this.obligations.recordAdministrativeStatus({
      obligationId: id,
      toStatus: dto.toStatus,
      actor: dto.actor ?? ObligationStatusChangeActor.COMPLIANCE_ADMIN,
      changedByIdentityId: session.identityId,
      reason: dto.reason,
      metadata: dto.metadata,
    });
  }

  @Get('obligations/:id/history')
  @ApiOperation({ summary: 'Retrieve obligation status history' })
  async getHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.obligations.getStatusHistory(id);
  }

  @Post('obligations/extend-deadline')
  @ApiOperation({ summary: 'Extend an obligation deadline with explicit authority' })
  async extendDeadline(@Body() dto: ExtendObligationDeadlineDto) {
    return this.obligations.extendDeadline({
      obligationId: dto.obligationId,
      extensionAuthorityReference: dto.extensionAuthorityReference,
      effectiveExtendedDueDate: new Date(dto.effectiveExtendedDueDate),
    });
  }

  @Post('submissions')
  @ApiOperation({ summary: 'Receive a compliance submission (receipt only, not verification)' })
  async receiveSubmission(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: ReceiveComplianceSubmissionDto,
  ) {
    return this.submissions.receiveSubmission(session.identityId, dto);
  }

  @Post('submissions/corrections')
  @ApiOperation({ summary: 'File a corrected submission version preserving the original' })
  async requestCorrection(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: RequestSubmissionCorrectionDto,
  ) {
    return this.submissions.requestCorrection(session.identityId, dto);
  }

  @Post('reviews/open')
  @ApiOperation({ summary: 'Open a compliance review for a submission version' })
  async openReview(
    @CurrentSession() session: SessionContextDto,
    @Body() body: { submissionId: string; submissionVersionId: string; criteria?: unknown[] },
  ) {
    return this.reviews.openReview(
      session.identityId,
      body.submissionId,
      body.submissionVersionId,
      body.criteria,
    );
  }

  @Post('reviews/finalize')
  @ApiOperation({ summary: 'Finalize a compliance review with authorized reviewer' })
  async finalizeReview(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: FinalizeComplianceReviewDto,
  ) {
    this.boundary.rejectForbiddenReviewFields(dto as unknown as Record<string, unknown>);
    return this.reviews.finalizeReview(session.identityId, dto);
  }
}
