import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AnalysisService } from './analysis/analysis.service';
import { MetricCalculationRunService } from './calculations/metric-calculation-run.service';
import { MeasuredPerformanceClaimService } from './claims/measured-performance-claim.service';
import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { ConsequentialUseService } from './consequential-use/consequential-use.service';
import { DigitalTwinService } from './digital-twin/digital-twin.service';
import { CreateMetricBaselineDto } from './dto/create-metric-baseline.dto';
import { CreateMetricDefinitionDto } from './dto/create-metric-definition.dto';
import { CreateMetricDefinitionVersionDto } from './dto/create-metric-definition-version.dto';
import { CreatePerformanceClaimDto } from './dto/create-performance-claim.dto';
import { CreatePerformanceFrameworkDto } from './dto/create-performance-framework.dto';
import { RecordMetricCalculationRunDto } from './dto/record-metric-calculation-run.dto';
import { ReviewPerformanceClaimDto } from './dto/review-performance-claim.dto';
import { PHASE_12F_BOUNDARY_DISCLAIMER } from './intelligence.constants';
import { MetricBaselineService } from './metrics/metric-baseline.service';
import { MetricDefinitionService } from './metrics/metric-definition.service';
import { PerformanceFrameworkService } from './metrics/performance-framework.service';
import { IntelligenceMonitoringService } from './monitoring/intelligence-monitoring.service';
import { RiskAssessmentService } from './risk/risk-assessment.service';
import { SimulationService } from './simulation/simulation.service';

@ApiTags('intelligence')
@Controller('intelligence')
export class IntelligenceController {
  constructor(
    private readonly boundary: IntelligenceBoundaryService,
    private readonly frameworkService: PerformanceFrameworkService,
    private readonly metricDefinitionService: MetricDefinitionService,
    private readonly baselineService: MetricBaselineService,
    private readonly calculationRunService: MetricCalculationRunService,
    private readonly claimService: MeasuredPerformanceClaimService,
    private readonly digitalTwin: DigitalTwinService,
    private readonly simulation: SimulationService,
    private readonly consequentialUse: ConsequentialUseService,
    private readonly analysisService: AnalysisService,
    private readonly monitoringService: IntelligenceMonitoringService,
    private readonly riskService: RiskAssessmentService,
  ) {}

  @Get('boundary')
  @ApiOperation({ summary: 'Performance measurement boundary metadata' })
  getBoundary() {
    return this.boundary.boundaryMetadata();
  }

  @Get('twin-simulation/boundary')
  @ApiOperation({ summary: 'Digital twin and simulation boundary disclaimer' })
  getTwinSimulationBoundaryDisclaimer(): { disclaimer: string } {
    return { disclaimer: PHASE_12F_BOUNDARY_DISCLAIMER };
  }

  @Post('frameworks')
  createFramework(@Body() dto: CreatePerformanceFrameworkDto) {
    return this.frameworkService.create(dto);
  }

  @Get('frameworks/:id')
  getFramework(@Param('id', ParseUUIDPipe) id: string) {
    return this.frameworkService.findById(id);
  }

  @Post('metrics')
  createMetric(@Body() dto: CreateMetricDefinitionDto) {
    return this.metricDefinitionService.createDefinition(dto);
  }

  @Post('metrics/:id/versions')
  createMetricVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMetricDefinitionVersionDto,
  ) {
    return this.metricDefinitionService.createVersion(id, dto);
  }

  @Post('metrics/:id/publish')
  publishMetric(@Param('id', ParseUUIDPipe) id: string) {
    return this.metricDefinitionService.publishDefinition(id);
  }

  @Post('metric-versions/:id/activate')
  activateMetricVersion(@Param('id', ParseUUIDPipe) id: string) {
    return this.metricDefinitionService.activateVersion(id);
  }

  @Post('baselines')
  createBaseline(@Body() dto: CreateMetricBaselineDto) {
    return this.baselineService.create(dto);
  }

  @Post('calculation-runs')
  recordCalculationRun(@Body() dto: RecordMetricCalculationRunDto) {
    return this.calculationRunService.recordRun(dto, process.env.API_VERSION ?? 'v1');
  }

  @Post('claims')
  createClaim(@Body() dto: CreatePerformanceClaimDto & { ownerIdentityId: string }) {
    return this.claimService.create(dto, dto.ownerIdentityId);
  }

  @Post('claims/:id/review')
  reviewClaim(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewPerformanceClaimDto & { reviewerIdentityId: string; actorType?: string },
  ) {
    return this.claimService.review(
      id,
      dto.reviewerIdentityId,
      dto,
      dto.actorType ?? 'HUMAN_REVIEWER',
    );
  }

  @Post('digital-twins/definitions')
  createDefinition(@Body() body: Parameters<DigitalTwinService['createDefinition']>[0]) {
    this.boundary.rejectClientProtectedFields(body as unknown as Record<string, unknown>);
    return this.digitalTwin.createDefinition(body);
  }

  @Get('digital-twins/definitions/:id')
  getDefinition(@Param('id') id: string) {
    return this.digitalTwin.findDefinitionById(id);
  }

  @Post('digital-twins/versions')
  createVersion(@Body() body: Parameters<DigitalTwinService['createVersion']>[0]) {
    return this.digitalTwin.createVersion(body);
  }

  @Get('digital-twins/versions/:id')
  getVersion(@Param('id') id: string) {
    return this.digitalTwin.findVersionById(id);
  }

  @Post('digital-twins/sources')
  addSource(@Body() body: Parameters<DigitalTwinService['addSource']>[0]) {
    return this.digitalTwin.addSource(body);
  }

  @Post('digital-twins/relationships')
  createRelationship(@Body() body: Parameters<DigitalTwinService['createRelationship']>[0]) {
    return this.digitalTwin.createRelationship(body);
  }

  @Post('digital-twins/modes')
  recordMode(@Body() body: Parameters<DigitalTwinService['recordMode']>[0]) {
    return this.digitalTwin.recordMode(body);
  }

  @Post('digital-twins/snapshots')
  createSnapshot(@Body() body: Parameters<DigitalTwinService['createSnapshot']>[0]) {
    return this.digitalTwin.createSnapshot(body);
  }

  @Post('simulations/scenarios')
  createScenario(@Body() body: Parameters<SimulationService['createScenario']>[0]) {
    this.boundary.rejectClientProtectedFields(body as unknown as Record<string, unknown>);
    return this.simulation.createScenario(body);
  }

  @Get('simulations/scenarios/:id')
  getScenario(@Param('id') id: string) {
    return this.simulation.findScenarioById(id);
  }

  @Post('simulations/runs')
  startRun(@Body() body: Parameters<SimulationService['startRun']>[0]) {
    return this.simulation.startRun(body);
  }

  @Post('simulations/runs/:id/outputs')
  recordOutput(
    @Param('id') id: string,
    @Body() body: Omit<Parameters<SimulationService['recordOutput']>[0], 'simulationRunId'>,
  ) {
    return this.simulation.recordOutput({ ...body, simulationRunId: id });
  }

  @Post('simulations/runs/:id/complete')
  completeRun(@Param('id') id: string) {
    return this.simulation.completeRun(id);
  }

  @Post('consequential-use/reviews')
  recordReview(@Body() body: Parameters<ConsequentialUseService['recordReview']>[0]) {
    this.boundary.rejectClientProtectedFields(body as unknown as Record<string, unknown>);
    return this.consequentialUse.recordReview(body);
  }

  @Post('consequential-use/live-transitions')
  proposeLiveTransition(
    @Body() body: Parameters<ConsequentialUseService['proposeLiveTransition']>[0],
  ) {
    this.boundary.rejectClientProtectedFields(body as unknown as Record<string, unknown>);
    return this.consequentialUse.proposeLiveTransition(body);
  }

  @Post('analysis/requests')
  createAnalysisRequest(@Body() body: Parameters<AnalysisService['createRequest']>[0]) {
    return this.analysisService.createRequest(body);
  }

  @Post('analysis/runs')
  startAnalysisRun(@Body() body: Parameters<AnalysisService['startRun']>[0]) {
    return this.analysisService.startRun(body);
  }

  @Post('analysis/runs/:runId/complete')
  completeAnalysisRun(@Param('runId') runId: string) {
    return this.analysisService.completeRun(runId);
  }

  @Get('analysis/runs/:runId/replay')
  getAnalysisReplay(@Param('runId') runId: string) {
    return this.analysisService.getReplayableOutput(runId);
  }

  @Post('monitoring/rules')
  createMonitoringRule(@Body() body: Parameters<IntelligenceMonitoringService['createRule']>[0]) {
    return this.monitoringService.createRule(body);
  }

  @Post('monitoring/rules/:ruleId/activate')
  activateMonitoringRule(@Param('ruleId') ruleId: string) {
    return this.monitoringService.activateRule(ruleId);
  }

  @Post('monitoring/observations')
  recordObservation(
    @Body() body: Parameters<IntelligenceMonitoringService['recordObservation']>[0],
  ) {
    return this.monitoringService.recordObservation(body);
  }

  @Post('monitoring/alerts')
  generateAlert(@Body() body: Parameters<IntelligenceMonitoringService['generateAlert']>[0]) {
    return this.monitoringService.generateAlert(body);
  }

  @Post('monitoring/alerts/verify')
  verifyAlert(@Body() body: Parameters<IntelligenceMonitoringService['verifyAlert']>[0]) {
    return this.monitoringService.verifyAlert(body);
  }

  @Post('monitoring/alerts/dispose')
  disposeAlert(@Body() body: Parameters<IntelligenceMonitoringService['disposeAlert']>[0]) {
    return this.monitoringService.disposeAlert(body);
  }

  @Post('risk/definitions')
  createRiskDefinition(@Body() body: Parameters<RiskAssessmentService['createDefinition']>[0]) {
    return this.riskService.createDefinition(body);
  }

  @Post('risk/assessments')
  createRiskAssessment(@Body() body: Parameters<RiskAssessmentService['createAssessment']>[0]) {
    return this.riskService.createAssessment(body);
  }
}
