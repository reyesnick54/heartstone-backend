import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { OperatorAccessAlignmentService } from './access/operator-access-alignment.service';
import { OperatorFunctionAccessService } from './access/operator-function-access.service';
import { ProductionReadinessBoundaryService } from './common/production-readiness-boundary.service';
import { DepartmentReadinessService } from './readiness/department-readiness.service';
import { ReadinessController } from './readiness/readiness.controller';
import { SupportController } from './support/support.controller';
import { SupportCoverageService } from './support/support-coverage.service';
import { OperationalRoleRequirementService } from './workforce/operational-role-requirement.service';
import { OperatorCompetencyAssessmentService } from './workforce/operator-competency-assessment.service';
import { OperatorQualificationService } from './workforce/operator-qualification.service';
import { OperatorReadinessProfileService } from './workforce/operator-readiness-profile.service';
import { TrainingService } from './workforce/training.service';
import { WorkforceController } from './workforce/workforce.controller';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [WorkforceController, SupportController, ReadinessController],
  providers: [
    ProductionReadinessBoundaryService,
    OperationalRoleRequirementService,
    OperatorReadinessProfileService,
    OperatorQualificationService,
    OperatorCompetencyAssessmentService,
    TrainingService,
    SupportCoverageService,
    DepartmentReadinessService,
    OperatorAccessAlignmentService,
    OperatorFunctionAccessService,
  ],
  exports: [
    ProductionReadinessBoundaryService,
    OperationalRoleRequirementService,
    OperatorReadinessProfileService,
    OperatorQualificationService,
    OperatorCompetencyAssessmentService,
    TrainingService,
    SupportCoverageService,
    DepartmentReadinessService,
    OperatorAccessAlignmentService,
    OperatorFunctionAccessService,
  ],
})
export class ProductionReadinessModule {}
