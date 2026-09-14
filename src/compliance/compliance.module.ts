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
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ComplianceBoundaryService } from './common/compliance-boundary.service';
import { ObligationRecurrenceService } from './common/obligation-recurrence.service';
import { ComplianceController } from './compliance.controller';
import { ComplianceMatterService } from './matters/compliance-matter.service';
import { ContinuingObligationService } from './obligations/continuing-obligation.service';
import { InspectionAssignmentService } from './planning/inspection-assignment.service';
import { InspectionPlanService } from './planning/inspection-plan.service';
import { InspectionPlanningBoundaryService } from './planning/inspection-planning-boundary.service';
import { InspectionScheduleService } from './planning/inspection-schedule.service';
import { InspectionTypeDefinitionService } from './planning/inspection-type-definition.service';
import { InspectorQualificationService } from './planning/inspector-qualification.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [ComplianceController],
import { ComplianceDashboardService } from './oversight/compliance-dashboard.service';
import { ComplianceMonitoringService } from './oversight/compliance-monitoring.service';
import { ComplianceProjectionService } from './oversight/compliance-projection.service';
import { ComplianceRevalidationService } from './oversight/compliance-revalidation.service';
import { ComplianceStatusController } from './oversight/compliance-status.controller';
import { ComplianceStatusBoundaryService } from './oversight/compliance-status-boundary.service';
import { ComplianceReviewService } from './reviews/compliance-review.service';
import { ComplianceSubmissionService } from './submissions/compliance-submission.service';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [ComplianceController, ComplianceStatusController],
  providers: [
    ComplianceBoundaryService,
    ObligationRecurrenceService,
    ComplianceMatterService,
    ContinuingObligationService,
    InspectionPlanningBoundaryService,
    InspectionTypeDefinitionService,
    InspectionPlanService,
    InspectionAssignmentService,
    InspectorQualificationService,
    InspectionScheduleService,
    ComplianceSubmissionService,
    ComplianceReviewService,
    ComplianceStatusBoundaryService,
    ComplianceProjectionService,
    ComplianceMonitoringService,
    ComplianceDashboardService,
    ComplianceRevalidationService,
  ],
  exports: [
    ComplianceBoundaryService,
    ObligationRecurrenceService,
    ComplianceMatterService,
    ContinuingObligationService,
    InspectionPlanningBoundaryService,
    InspectionTypeDefinitionService,
    InspectionPlanService,
    InspectionAssignmentService,
    InspectorQualificationService,
    InspectionScheduleService,
    ComplianceSubmissionService,
    ComplianceReviewService,
    ComplianceStatusBoundaryService,
    ComplianceProjectionService,
    ComplianceMonitoringService,
    ComplianceDashboardService,
    ComplianceRevalidationService,
  ],
})
export class ComplianceModule {}
