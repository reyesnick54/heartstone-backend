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
  }
}
