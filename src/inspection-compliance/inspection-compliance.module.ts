import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { ComplianceAssessmentService } from './assessment/compliance-assessment.service';
import { InspectionComplianceBoundaryService as InspectionExecutionBoundaryService } from './boundary/inspection-compliance-boundary.service';
import { InspectionComplianceBoundaryService as CorrectiveActionBoundaryService } from './common/inspection-compliance-boundary.service';
import { InspectionCompletionService } from './completion/inspection-completion.service';
import { CorrectiveActionService } from './corrective-action/corrective-action.service';
import { EmergencyInterimActionService } from './emergency/emergency-interim-action.service';
import { ComplianceEscalationService } from './escalation/compliance-escalation.service';
import { InspectionFindingService } from './finding/inspection-finding.service';
import { NoncomplianceFindingService } from './findings/noncompliance-finding.service';
import { InspectionObservationService } from './observation/inspection-observation.service';
import { ProtectiveActionRecommendationService } from './protective/protective-action-recommendation.service';
import { EnforcementReferralService } from './referral/enforcement-referral.service';
import { InspectionResponseService } from './response/inspection-response.service';
import { InspectionSessionService } from './session/inspection-session.service';

@Module({
  imports: [DatabaseModule, AuthorityModule, EvidenceModule],
  providers: [
    InspectionExecutionBoundaryService,
    CorrectiveActionBoundaryService,
    InspectionSessionService,
    InspectionObservationService,
    InspectionFindingService,
    InspectionResponseService,
    InspectionCompletionService,
    CorrectiveActionService,
    ComplianceAssessmentService,
    NoncomplianceFindingService,
    ComplianceEscalationService,
    EnforcementReferralService,
    ProtectiveActionRecommendationService,
    EmergencyInterimActionService,
  ],
  exports: [
    InspectionExecutionBoundaryService,
    CorrectiveActionBoundaryService,
    InspectionSessionService,
    InspectionObservationService,
    InspectionFindingService,
    InspectionResponseService,
    InspectionCompletionService,
    CorrectiveActionService,
    ComplianceAssessmentService,
    NoncomplianceFindingService,
    ComplianceEscalationService,
    EnforcementReferralService,
    ProtectiveActionRecommendationService,
    EmergencyInterimActionService,
  ],
})
export class InspectionComplianceModule {}
