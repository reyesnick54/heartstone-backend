import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
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
  ],
})
export class ComplianceModule {}
