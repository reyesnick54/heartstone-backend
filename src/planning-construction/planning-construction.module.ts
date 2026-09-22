import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { DepartmentModule } from '../experience/department/department.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { PlanningConstructionAccessService } from './common/planning-construction-access.service';
import { PlanningConstructionAuthorityService } from './common/planning-construction-authority.service';
import { PlanningConstructionBoundaryService } from './common/planning-construction-boundary.service';
import {
  CitizenDevelopmentActionsController,
  CitizenDevelopmentController,
} from './experience/citizen-development.controller';
import { DepartmentPlanningConstructionController } from './experience/department-planning-construction.controller';
import { OfficialPlanningConstructionController } from './experience/official-planning-construction.controller';
import { DepartmentPlanningConstructionMetricsService } from './experience/services/department-planning-construction-metrics.service';
import { DevelopmentPortalProjectionService } from './experience/services/development-portal-projection.service';
import { OfficialPlanningConstructionProjectionService } from './experience/services/official-planning-construction-projection.service';
import { PlanningConstructionScopeService } from './experience/services/planning-construction-scope.service';
import { DevelopmentExternalDependencyService } from './external/development-external-dependency.service';
import { DevelopmentFeeService } from './fees/development-fee.service';
import { DevelopmentInspectionService } from './inspections/development-inspection.service';
import { DevelopmentOccupancyService } from './occupancy/development-occupancy.service';
import { DevelopmentPermitService } from './permits/development-permit.service';

@Module({
  imports: [DatabaseModule, SessionsModule, OfficialModule, DepartmentModule, AuthorityModule],
  controllers: [
    CitizenDevelopmentController,
    CitizenDevelopmentActionsController,
    OfficialPlanningConstructionController,
    DepartmentPlanningConstructionController,
  ],
  providers: [
    PlanningConstructionBoundaryService,
    PlanningConstructionAccessService,
    PlanningConstructionAuthorityService,
    DevelopmentExternalDependencyService,
    DevelopmentPermitService,
    DevelopmentInspectionService,
    DevelopmentFeeService,
    DevelopmentOccupancyService,
    DevelopmentPortalProjectionService,
    PlanningConstructionScopeService,
    OfficialPlanningConstructionProjectionService,
    DepartmentPlanningConstructionMetricsService,
  ],
  exports: [
    PlanningConstructionBoundaryService,
    PlanningConstructionAccessService,
    PlanningConstructionAuthorityService,
    DevelopmentPermitService,
    DevelopmentInspectionService,
    DevelopmentFeeService,
    DevelopmentOccupancyService,
    DevelopmentExternalDependencyService,
    PlanningConstructionScopeService,
    DepartmentPlanningConstructionMetricsService,
  ],
})
export class PlanningConstructionModule {}
