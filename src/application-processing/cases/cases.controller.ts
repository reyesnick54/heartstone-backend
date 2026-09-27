import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CaseReferralType } from '@prisma/client';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { CompletenessReviewsService } from '../completeness/completeness-reviews.service';
import { CaseReferralsService } from '../referrals/case-referrals.service';
import { WorkflowRuntimeService } from '../workflow/workflow-runtime.service';
import { CaseManagerAssignmentService } from './case-manager/case-manager-assignment.service';
import { CasesService } from './cases.service';

@ApiTags('application-processing-cases')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
  authenticationRequired: true,
  scopeRequirement: 'Applicant-owned case/application scope or official institutional case scope',
  authorityRequirement: 'Case access guard; official routes require institutional actor context',
  actorSource: 'Session identity with applicant or official case access resolution',
  primarySecurityInvariant: 'Access to a case does not confer decision authority',
})
@Controller('cases')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly workflowRuntime: WorkflowRuntimeService,
    private readonly completenessReviews: CompletenessReviewsService,
    private readonly referrals: CaseReferralsService,
    private readonly caseManagerAssignments: CaseManagerAssignmentService,
  ) {}

  @Get('case-manager/workload')
  getCaseManagerWorkload(
    @Query('institutionId') institutionId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.caseManagerAssignments.getWorkloadByOfficeholder({ institutionId, departmentId });
  }

  @Get(':id')
  findOne(@CurrentSession() session: SessionContextDto, @Param('id', ParseUUIDPipe) id: string) {
    return this.casesService.findById(session, id);
  }

  @Get(':id/applicant-status')
  getApplicantStatus(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.casesService.getApplicantStatus(session, id);
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

  @Post(':id/case-manager/assign')
  assignCaseManager(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) caseId: string,
    @Body()
    body: {
      officeholderId: string;
      institutionId: string;
      departmentId: string;
      reason: string;
      effectiveFrom?: string;
    },
  ) {
    return this.caseManagerAssignments.assign({
      caseId,
      officeholderId: body.officeholderId,
      institutionId: body.institutionId,
      departmentId: body.departmentId,
      reason: body.reason,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
      assignedByIdentityId: session.identityId,
    });
  }

  @Get(':id/case-manager/history')
  getCaseManagerHistory(@Param('id', ParseUUIDPipe) caseId: string) {
    return this.caseManagerAssignments.getAssignmentHistory(caseId);
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
