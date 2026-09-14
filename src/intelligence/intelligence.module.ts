import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { AnalysisService } from './analysis/analysis.service';
import { CommandConsoleController } from './command-console/command-console.controller';
import { DashboardAccessPolicyService } from './command-console/dashboard-access-policy.service';
import { DashboardBoundaryService } from './command-console/dashboard-boundary.service';
import { DashboardDefinitionService } from './command-console/dashboard-definition.service';
import { DashboardIndicatorProjectionService } from './command-console/dashboard-indicator-projection.service';
import { DashboardQueryService } from './command-console/dashboard-query.service';
import { DashboardSnapshotService } from './command-console/dashboard-snapshot.service';
import { DashboardStatusDictionaryService } from './command-console/dashboard-status-dictionary.service';
import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { StrategicProjectBoundaryService } from './common/strategic-project-boundary.service';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceMonitoringService } from './monitoring/intelligence-monitoring.service';
import { PerformanceClaimService } from './performance-claims/performance-claim.service';
import { RiskAssessmentService } from './risk/risk-assessment.service';
import { CapitalEvidenceService } from './strategic-projects/capital-evidence.service';
import { EmploymentEvidenceService } from './strategic-projects/employment-evidence.service';
import { InfrastructureDeliveryService } from './strategic-projects/infrastructure-delivery.service';
import { ProjectStatusProjectionService } from './strategic-projects/project-status-projection.service';
import { SectorDevelopmentObservationService } from './strategic-projects/sector-development-observation.service';
import { StrategicProjectController } from './strategic-projects/strategic-project.controller';
import { StrategicProjectDependencyService } from './strategic-projects/strategic-project-dependency.service';
import { StrategicProjectEconomicClaimService } from './strategic-projects/strategic-project-economic-claim.service';
import { StrategicProjectMilestoneService } from './strategic-projects/strategic-project-milestone.service';
import { StrategicProjectProfileService } from './strategic-projects/strategic-project-profile.service';
import { StrategicProjectRiskService } from './strategic-projects/strategic-project-risk.service';
import { StrategicProjectStageService } from './strategic-projects/strategic-project-stage.service';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [IntelligenceController, CommandConsoleController, StrategicProjectController],
  providers: [
    IntelligenceBoundaryService,
    AnalysisService,
    IntelligenceMonitoringService,
    RiskAssessmentService,
    DashboardBoundaryService,
    DashboardStatusDictionaryService,
    DashboardDefinitionService,
    DashboardAccessPolicyService,
    DashboardIndicatorProjectionService,
    DashboardSnapshotService,
    DashboardQueryService,
    StrategicProjectBoundaryService,
    PerformanceClaimService,
    StrategicProjectProfileService,
    StrategicProjectStageService,
    StrategicProjectMilestoneService,
    StrategicProjectDependencyService,
    StrategicProjectRiskService,
    StrategicProjectEconomicClaimService,
    CapitalEvidenceService,
    EmploymentEvidenceService,
    InfrastructureDeliveryService,
    SectorDevelopmentObservationService,
    ProjectStatusProjectionService,
  ],
  exports: [
    IntelligenceBoundaryService,
    AnalysisService,
    IntelligenceMonitoringService,
    RiskAssessmentService,
    DashboardBoundaryService,
    DashboardStatusDictionaryService,
    DashboardDefinitionService,
    DashboardAccessPolicyService,
    DashboardIndicatorProjectionService,
    DashboardSnapshotService,
    DashboardQueryService,
    StrategicProjectBoundaryService,
    PerformanceClaimService,
    StrategicProjectProfileService,
    StrategicProjectStageService,
    StrategicProjectMilestoneService,
    StrategicProjectDependencyService,
    StrategicProjectRiskService,
    StrategicProjectEconomicClaimService,
    CapitalEvidenceService,
    EmploymentEvidenceService,
    InfrastructureDeliveryService,
    SectorDevelopmentObservationService,
    ProjectStatusProjectionService,
  ],
})
export class IntelligenceModule {}
