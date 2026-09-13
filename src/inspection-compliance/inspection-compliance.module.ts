import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { ComplianceAssessmentService } from './assessment/compliance-assessment.service';
import { EmergencyInterimActionService } from './emergency/emergency-interim-action.service';
import { ComplianceEscalationService } from './escalation/compliance-escalation.service';
import { NoncomplianceFindingService } from './findings/noncompliance-finding.service';
import { ProtectiveActionRecommendationService } from './protective/protective-action-recommendation.service';
import { EnforcementReferralService } from './referral/enforcement-referral.service';

@Module({
  imports: [AuthorityModule],
  providers: [
    ComplianceAssessmentService,
    NoncomplianceFindingService,
    ComplianceEscalationService,
    EnforcementReferralService,
    ProtectiveActionRecommendationService,
    EmergencyInterimActionService,
  ],
  exports: [
    ComplianceAssessmentService,
    NoncomplianceFindingService,
    ComplianceEscalationService,
    EnforcementReferralService,
    ProtectiveActionRecommendationService,
    EmergencyInterimActionService,
  ],
})
export class InspectionComplianceModule {}
