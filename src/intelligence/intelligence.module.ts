import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { RecordsModule } from '../records/records.module';
import { AiAgentService } from './ai/ai-agent.service';
import { AiExecutionService } from './ai/ai-execution.service';
import { AiModelRegistryService } from './ai/ai-model-registry.service';
import { AiPromptGovernanceService } from './ai/ai-prompt-governance.service';
import { AiUseCaseService } from './ai/ai-use-case.service';
import { DeterministicAiAdapter } from './ai/deterministic-ai.adapter';
import { AnalysisEngineService } from './analysis/analysis-engine.service';
import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { IntelligenceSafeHaltService } from './common/intelligence-safe-halt.service';
import { DashboardDefinitionService } from './dashboards/dashboard-definition.service';
import { DashboardIndicatorService } from './dashboards/dashboard-indicator.service';
import { DepartmentalConsoleService } from './dashboards/departmental-console.service';
import { ExecutiveDashboardService } from './dashboards/executive-dashboard.service';
import { IntelligenceController } from './intelligence.controller';
import { MetricCalculationService } from './metrics/metric-calculation.service';
import { MetricDefinitionService } from './metrics/metric-definition.service';
import { PerformanceClaimService } from './metrics/performance-claim.service';
import { PerformanceFrameworkService } from './metrics/performance-framework.service';
import { IntelligenceMonitoringService } from './monitoring/intelligence-monitoring.service';
import { HistoricalReplayService } from './reports/historical-replay.service';
import { ReportService } from './reports/report.service';
import { RiskAssessmentService } from './risk/risk-assessment.service';
import { StrategicProjectService } from './strategic-projects/strategic-project.service';
import { DigitalTwinService } from './twins/digital-twin.service';
import { SimulationService } from './twins/simulation.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule, RecordsModule, EvidenceModule],
  controllers: [IntelligenceController],
  providers: [
    IntelligenceBoundaryService,
    IntelligenceSafeHaltService,
    PerformanceFrameworkService,
    MetricDefinitionService,
    MetricCalculationService,
    PerformanceClaimService,
    DashboardDefinitionService,
    DashboardIndicatorService,
    ExecutiveDashboardService,
    DepartmentalConsoleService,
    StrategicProjectService,
    AiModelRegistryService,
    AiUseCaseService,
    AiAgentService,
    AiExecutionService,
    AiPromptGovernanceService,
    DeterministicAiAdapter,
    AnalysisEngineService,
    IntelligenceMonitoringService,
    RiskAssessmentService,
    DigitalTwinService,
    SimulationService,
    ReportService,
    HistoricalReplayService,
  ],
  exports: [
    IntelligenceBoundaryService,
    IntelligenceSafeHaltService,
    PerformanceFrameworkService,
    MetricDefinitionService,
    MetricCalculationService,
    PerformanceClaimService,
    DashboardDefinitionService,
    DashboardIndicatorService,
    ExecutiveDashboardService,
    DepartmentalConsoleService,
    StrategicProjectService,
    AiModelRegistryService,
    AiUseCaseService,
    AiAgentService,
    AiExecutionService,
    AiPromptGovernanceService,
    AnalysisEngineService,
    IntelligenceMonitoringService,
    RiskAssessmentService,
    DigitalTwinService,
    SimulationService,
    ReportService,
    HistoricalReplayService,
  ],
})
export class IntelligenceModule {}
