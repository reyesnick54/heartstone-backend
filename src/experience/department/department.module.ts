import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { DepartmentController } from './department.controller';
import { DepartmentAccessService } from './services/department-access.service';
import { DepartmentAlertsService } from './services/department-alerts.service';
import { DepartmentAppealsService } from './services/department-appeals.service';
import { DepartmentCaseQueryService } from './services/department-case-query.service';
import { DepartmentCasesService } from './services/department-cases.service';
import { DepartmentComplianceService } from './services/department-compliance.service';
import { DepartmentDependenciesService } from './services/department-dependencies.service';
import { DepartmentHomeService } from './services/department-home.service';
import { DepartmentMeService } from './services/department-me.service';
import { DepartmentMetricsFreshnessService } from './services/department-metrics-freshness.service';
import { DepartmentOfficersService } from './services/department-officers.service';
import { DepartmentServicesService } from './services/department-services.service';
import { DepartmentSlaService } from './services/department-sla.service';
import { DepartmentWorkloadService } from './services/department-workload.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DepartmentController],
  providers: [
    DepartmentAccessService,
    DepartmentMetricsFreshnessService,
    DepartmentCaseQueryService,
    DepartmentMeService,
    DepartmentHomeService,
    DepartmentWorkloadService,
    DepartmentServicesService,
    DepartmentCasesService,
    DepartmentOfficersService,
    DepartmentSlaService,
    DepartmentComplianceService,
    DepartmentAppealsService,
    DepartmentDependenciesService,
    DepartmentAlertsService,
  ],
  exports: [
    DepartmentAccessService,
    DepartmentMetricsFreshnessService,
    DepartmentMeService,
    DepartmentHomeService,
    DepartmentWorkloadService,
    DepartmentServicesService,
    DepartmentCasesService,
    DepartmentOfficersService,
    DepartmentSlaService,
    DepartmentComplianceService,
    DepartmentAppealsService,
    DepartmentDependenciesService,
    DepartmentAlertsService,
  ],
})
export class DepartmentModule {}
