import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../identity/auth/auth.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { AnalysisService } from './analysis/analysis.service';
import { MetricCalculationRunService } from './calculations/metric-calculation-run.service';
import { MeasuredPerformanceClaimService } from './claims/measured-performance-claim.service';
import { CommandConsoleController } from './command-console/command-console.controller';
import { DashboardAccessPolicyService } from './command-console/dashboard-access-policy.service';
import { DashboardBoundaryService } from './command-console/dashboard-boundary.service';
import { DashboardDefinitionService } from './command-console/dashboard-definition.service';
import { DashboardIndicatorProjectionService } from './command-console/dashboard-indicator-projection.service';
import { DashboardQueryService } from './command-console/dashboard-query.service';
import { DashboardSnapshotService } from './command-console/dashboard-snapshot.service';
import { DashboardStatusDictionaryService } from './command-console/dashboard-status-dictionary.service';
import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { IntelligenceConsequentialAuthorityService } from './common/intelligence-consequential-authority.service';
import { IntelligenceInstitutionalScopeService } from './common/intelligence-institutional-scope.service';
import { StrategicProjectBoundaryService } from './common/strategic-project-boundary.service';
import { ConsequentialUseService } from './consequential-use/consequential-use.service';
import { DigitalTwinService } from './digital-twin/digital-twin.service';
import { IntelligenceController } from './intelligence.controller';
import { MetricBaselineService } from './metrics/metric-baseline.service';
import { MetricDefinitionService } from './metrics/metric-definition.service';
import { PerformanceFrameworkService } from './metrics/performance-framework.service';
import { IntelligenceMonitoringService } from './monitoring/intelligence-monitoring.service';
import { PerformanceClaimService } from './performance-claims/performance-claim.service';
import { RiskAssessmentService } from './risk/risk-assessment.service';
import { SimulationService } from './simulation/simulation.service';
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
  imports: [DatabaseModule, SessionsModule, AuthModule, AuthorityModule],
  controllers: [CommandConsoleController, StrategicProjectController, IntelligenceController],
  providers: [
    SessionAuthGuard,
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
    IntelligenceBoundaryService,
    IntelligenceInstitutionalScopeService,
    IntelligenceConsequentialAuthorityService,
    PerformanceFrameworkService,
    MetricDefinitionService,
    MetricBaselineService,
    MetricCalculationRunService,
    MeasuredPerformanceClaimService,
    DigitalTwinService,
    SimulationService,
    ConsequentialUseService,
    AnalysisService,
    IntelligenceMonitoringService,
    RiskAssessmentService,
  ],
  exports: [
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
    IntelligenceBoundaryService,
    IntelligenceInstitutionalScopeService,
    IntelligenceConsequentialAuthorityService,
    PerformanceFrameworkService,
    MetricDefinitionService,
    MetricBaselineService,
    MetricCalculationRunService,
    MeasuredPerformanceClaimService,
    DigitalTwinService,
    SimulationService,
    ConsequentialUseService,
    AnalysisService,
    IntelligenceMonitoringService,
    RiskAssessmentService,
  ],
})
export class IntelligenceModule {}
