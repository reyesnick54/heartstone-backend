import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CaseReferralType } from '@prisma/client';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CompletenessReviewsService } from '../completeness/completeness-reviews.service';
import { CaseReferralsService } from '../referrals/case-referrals.service';
import { WorkflowRuntimeService } from '../workflow/workflow-runtime.service';
import { CasesService } from './cases.service';

@ApiTags('application-processing-cases')
@Controller('cases')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly workflowRuntime: WorkflowRuntimeService,
    private readonly completenessReviews: CompletenessReviewsService,
    private readonly referrals: CaseReferralsService,
  ) {}

  @Get(':id')
  findOne(@CurrentSession() session: SessionContextDto, @Param('id', ParseUUIDPipe) id: string) {
    return this.casesService.findById(id, session.identityId);
  }

  @Get(':id/applicant-status')
  getApplicantStatus(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.casesService.getApplicantStatus(id, session.identityId);
  }

  @Post(':id/workflow/steps/:stepKey/complete')
  completeStep(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) caseId: string,
    @Param('stepKey') stepKey: string,
    @Body()
    body: {
      officeholderId?: string;
      officeId?: string;
      appointmentId?: string;
      delegationId?: string;
      outcome?: string;
    },
  ) {
    return this.workflowRuntime.completeStep({
      caseId,
      stepKey,
      actorIdentityId: session.identityId,
      ...body,
    });
  }

  @Post(':id/completeness-reviews')
  runCompletenessReview(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) caseId: string,
    @Body()
    body: {
      applicationSubmissionId: string;
      checklistResults: { itemCode: string; status: 'PRESENT' | 'MISSING' | 'NOT_APPLICABLE' }[];
      notes?: string;
    },
  ) {
    return this.completenessReviews.runReview({
      caseId,
      applicationSubmissionId: body.applicationSubmissionId,
      reviewerIdentityId: session.identityId,
      checklistResults: body.checklistResults,
      notes: body.notes,
    });
  }

  @Post(':id/referrals')
  createReferral(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) caseId: string,
    @Body()
    body: {
      referralType: CaseReferralType;
      externalAuthorityId?: string;
      institutionId?: string;
      authorityDependencyId?: string;
      referralBasis?: string;
      scope?: string;
    },
  ) {
    return this.referrals.createReferral({
      caseId,
      actorIdentityId: session.identityId,
      ...body,
    });
  }

  @Post('referrals/:referralId/responses')
  recordReferralResponse(
    @CurrentSession() session: SessionContextDto,
    @Param('referralId', ParseUUIDPipe) referralId: string,
    @Body()
    body: {
      responseReference: string;
      responseSummary: string;
      authenticationStatus: 'UNAUTHENTICATED' | 'AUTHENTICATED' | 'REJECTED';
      satisfiesDependency?: boolean;
    },
  ) {
    return this.referrals.recordResponse({
      caseReferralId: referralId,
      actorIdentityId: session.identityId,
      ...body,
    });
  }
}
