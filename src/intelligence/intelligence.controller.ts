import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { ConsequentialUseService } from './consequential-use/consequential-use.service';
import { DigitalTwinService } from './digital-twin/digital-twin.service';
import { PHASE_12F_BOUNDARY_DISCLAIMER } from './intelligence.constants';
import { SimulationService } from './simulation/simulation.service';
import { AnalysisService } from './analysis/analysis.service';
import { IntelligenceMonitoringService } from './monitoring/intelligence-monitoring.service';
import { RiskAssessmentService } from './risk/risk-assessment.service';

@Controller('intelligence')
export class IntelligenceController {
  constructor(
    private readonly boundary: IntelligenceBoundaryService,
    private readonly digitalTwin: DigitalTwinService,
    private readonly simulation: SimulationService,
    private readonly consequentialUse: ConsequentialUseService,
    private readonly analysisService: AnalysisService,
    private readonly monitoringService: IntelligenceMonitoringService,
    private readonly riskService: RiskAssessmentService,
  ) {}

  @Get('boundary')
  getBoundaryDisclaimer(): { disclaimer: string } {
    return { disclaimer: PHASE_12F_BOUNDARY_DISCLAIMER };
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
