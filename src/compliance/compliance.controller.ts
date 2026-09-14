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
