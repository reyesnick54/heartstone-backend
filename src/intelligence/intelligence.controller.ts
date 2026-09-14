import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { AnalysisService } from './analysis/analysis.service';
import { IntelligenceMonitoringService } from './monitoring/intelligence-monitoring.service';
import { RiskAssessmentService } from './risk/risk-assessment.service';

@Controller('intelligence')
export class IntelligenceController {
  constructor(
    private readonly analysisService: AnalysisService,
    private readonly monitoringService: IntelligenceMonitoringService,
    private readonly riskService: RiskAssessmentService,
  ) {}

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
