import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SimulationOutputType } from '@prisma/client';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { AiAgentService } from './ai/ai-agent.service';
import { AiExecutionService } from './ai/ai-execution.service';
import { AiModelRegistryService } from './ai/ai-model-registry.service';
import { AiPromptGovernanceService } from './ai/ai-prompt-governance.service';
import { AiUseCaseService } from './ai/ai-use-case.service';
import { AnalysisEngineService } from './analysis/analysis-engine.service';
import { DashboardDefinitionService } from './dashboards/dashboard-definition.service';
import { DashboardIndicatorService } from './dashboards/dashboard-indicator.service';
import { DepartmentalConsoleService } from './dashboards/departmental-console.service';
import { ExecutiveDashboardService } from './dashboards/executive-dashboard.service';
import { INTELLIGENCE_BOUNDARY_DISCLAIMER } from './intelligence.constants';
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

@ApiTags('intelligence')
@Controller('intelligence')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class IntelligenceController {
  constructor(
    private readonly performanceFrameworks: PerformanceFrameworkService,
    private readonly metricDefinitions: MetricDefinitionService,
    private readonly metricCalculations: MetricCalculationService,
    private readonly performanceClaims: PerformanceClaimService,
    private readonly dashboardDefinitions: DashboardDefinitionService,
    private readonly dashboardIndicators: DashboardIndicatorService,
    private readonly executiveDashboards: ExecutiveDashboardService,
    private readonly departmentalConsoles: DepartmentalConsoleService,
    private readonly strategicProjects: StrategicProjectService,
    private readonly aiModels: AiModelRegistryService,
    private readonly aiUseCases: AiUseCaseService,
    private readonly aiAgents: AiAgentService,
    private readonly aiExecutions: AiExecutionService,
    private readonly aiPromptGovernance: AiPromptGovernanceService,
    private readonly analysisEngine: AnalysisEngineService,
    private readonly monitoring: IntelligenceMonitoringService,
    private readonly riskAssessments: RiskAssessmentService,
    private readonly digitalTwins: DigitalTwinService,
    private readonly simulations: SimulationService,
    private readonly reports: ReportService,
    private readonly historicalReplay: HistoricalReplayService,
  ) {}

  @Get('boundary')
  @ApiOperation({ summary: 'Intelligence layer boundary disclaimer' })
  getBoundaryDisclaimer(): { disclaimer: string } {
    return { disclaimer: INTELLIGENCE_BOUNDARY_DISCLAIMER };
  }

  @Post('metrics/frameworks')
  createPerformanceFramework(@Body() body: Parameters<PerformanceFrameworkService['createFramework']>[0]) {
    return this.performanceFrameworks.createFramework(body);
  }

  @Post('metrics/definitions')
  createMetricDefinition(@Body() body: Parameters<MetricDefinitionService['createDefinition']>[0]) {
    return this.metricDefinitions.createDefinition(body);
  }

  @Post('metrics/calculations')
  startMetricCalculation(@Body() body: Parameters<MetricCalculationService['startCalculationRun']>[0]) {
    return this.metricCalculations.startCalculationRun(body);
  }

  @Post('metrics/claims')
  createPerformanceClaim(@Body() body: Parameters<PerformanceClaimService['createClaim']>[0]) {
    return this.performanceClaims.createClaim(body);
  }

  @Post('dashboards/definitions')
  createDashboard(@Body() body: Parameters<DashboardDefinitionService['createDefinition']>[0]) {
    return this.dashboardDefinitions.createDefinition(body);
  }

  @Post('dashboards/indicators/projections')
  projectIndicator(@Body() body: Parameters<DashboardIndicatorService['projectIndicator']>[0]) {
    return this.dashboardIndicators.projectIndicator(body);
  }

  @Get('dashboards/executive/:institutionId/:dashboardCode')
  getExecutiveDashboard(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Param('dashboardCode') dashboardCode: string,
  ) {
    return this.executiveDashboards.getExecutiveView(institutionId, dashboardCode);
  }

  @Get('dashboards/departmental/:institutionId/:dashboardCode')
  getDepartmentalConsole(
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Param('dashboardCode') dashboardCode: string,
  ) {
    return this.departmentalConsoles.getDepartmentalView(institutionId, dashboardCode);
  }

  @Post('strategic-projects')
  createStrategicProject(@Body() body: Parameters<StrategicProjectService['createProject']>[0]) {
    return this.strategicProjects.createProject(body);
  }

  @Post('strategic-projects/milestones')
  reportMilestone(@Body() body: Parameters<StrategicProjectService['reportMilestone']>[0]) {
    return this.strategicProjects.reportMilestone(body);
  }

  @Post('ai/models')
  registerAiModel(@Body() body: Parameters<AiModelRegistryService['registerModel']>[0]) {
    return this.aiModels.registerModel(body);
  }

  @Post('ai/use-cases')
  createAiUseCase(@Body() body: Parameters<AiUseCaseService['createUseCase']>[0]) {
    return this.aiUseCases.createUseCase(body);
  }

  @Post('ai/agents')
  createAiAgent(@Body() body: Parameters<AiAgentService['createAgent']>[0]) {
    return this.aiAgents.createAgent(body);
  }

  @Post('ai/executions')
  executeAi(@Body() body: Parameters<AiExecutionService['execute']>[0]) {
    return this.aiExecutions.execute(body);
  }

  @Post('ai/prompts/govern')
  governPrompt(@Body() body: Parameters<AiPromptGovernanceService['govern']>[0]) {
    return this.aiPromptGovernance.govern(body);
  }

  @Post('analysis/requests')
  createAnalysisRequest(
    @CurrentSession() session: SessionContextDto,
    @Body() body: Omit<Parameters<AnalysisEngineService['createRequest']>[0], 'requestedByIdentityId'>,
  ) {
    return this.analysisEngine.createRequest({
      ...body,
      requestedByIdentityId: session.identityId,
    });
  }

  @Post('monitoring/observations')
  recordObservation(@Body() body: Parameters<IntelligenceMonitoringService['recordObservation']>[0]) {
    return this.monitoring.recordObservation(body);
  }

  @Post('monitoring/alerts')
  raiseAlert(@Body() body: Parameters<IntelligenceMonitoringService['raiseAlert']>[0]) {
    return this.monitoring.raiseAlert(body);
  }

  @Post('risk-assessments')
  createRiskAssessment(@Body() body: Parameters<RiskAssessmentService['createAssessment']>[0]) {
    return this.riskAssessments.createAssessment(body);
  }

  @Post('twins')
  createDigitalTwin(@Body() body: Parameters<DigitalTwinService['createDefinition']>[0]) {
    return this.digitalTwins.createDefinition(body);
  }

  @Post('simulations/runs')
  startSimulation(@Body() body: Parameters<SimulationService['startRun']>[0]) {
    return this.simulations.startRun(body);
  }

  @Post('simulations/outputs')
  recordSimulationOutput(
    @Body()
    body: {
      simulationRunId: string;
      outputType: SimulationOutputType;
      outputData: Record<string, unknown>;
    },
  ) {
    return this.simulations.recordOutput(body.simulationRunId, body.outputType, body.outputData);
  }

  @Post('reports/definitions')
  createReportDefinition(@Body() body: Parameters<ReportService['createDefinition']>[0]) {
    return this.reports.createDefinition(body);
  }

  @Post('reports/traces')
  createDecisionTrace(@Body() body: Parameters<HistoricalReplayService['createDecisionTrace']>[0]) {
    return this.historicalReplay.createDecisionTrace(body);
  }

  @Get('reports/traces/:traceReference/replay')
  replayDecisionTrace(@Param('traceReference') traceReference: string) {
    return this.historicalReplay.replayTrace(traceReference);
  }
}
