import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ComplianceController } from './compliance.controller';
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

@Module({
  imports: [SessionsModule, AuthorityModule, EvidenceModule],
  controllers: [ComplianceController],
  providers: [
    SessionAuthGuard,
    ComplianceBoundaryService,
    ComplianceMatterService,
    ContinuingObligationService,
    ComplianceSubmissionService,
    ComplianceReviewService,
    InspectionPlanningService,
    InspectionExecutionService,
    InspectionFindingService,
    CorrectiveActionService,
    ComplianceEscalationService,
    EnforcementReferralService,
    EmergencyInterimActionService,
    ComplianceProjectionService,
  ],
  exports: [
    ComplianceBoundaryService,
    ComplianceMatterService,
    ContinuingObligationService,
    ComplianceSubmissionService,
    ComplianceReviewService,
    InspectionPlanningService,
    InspectionExecutionService,
    InspectionFindingService,
    CorrectiveActionService,
    ComplianceEscalationService,
    EnforcementReferralService,
    EmergencyInterimActionService,
    ComplianceProjectionService,
  ],
})
export class ComplianceModule {}
