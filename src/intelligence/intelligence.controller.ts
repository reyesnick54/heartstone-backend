import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IdentityType } from '@prisma/client';

import { type ActorContext } from '../identity/auth/context/actor-context.types';
import { CurrentActor } from '../identity/auth/decorators/current-actor.decorator';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { AnalysisService } from './analysis/analysis.service';
import { MetricCalculationRunService } from './calculations/metric-calculation-run.service';
import { MeasuredPerformanceClaimService } from './claims/measured-performance-claim.service';
import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { IntelligenceConsequentialAuthorityService } from './common/intelligence-consequential-authority.service';
import { IntelligenceForbiddenClientFieldsInterceptor } from './common/intelligence-forbidden-client-fields.interceptor';
import { IntelligenceInstitutionalScopeService } from './common/intelligence-institutional-scope.service';
import { IntelligenceSuspendedAiGuard } from './common/intelligence-suspended-ai.guard';
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

const INTELLIGENCE_ACTOR_GUARDS = [IntelligenceSuspendedAiGuard] as const;

@ApiTags('intelligence')
@UseInterceptors(IntelligenceForbiddenClientFieldsInterceptor)
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Analytics, metrics, and command-console institutional scope",
  authorityRequirement: "Intelligence module access; analytics do not create authority",
  actorSource: "Authenticated institutional analyst or administrator",
  primarySecurityInvariant: "Analytics and AI outputs are advisory, not official decisions",
})
@Controller('intelligence')
export class IntelligenceController {
  constructor(
    private readonly boundary: IntelligenceBoundaryService,
    private readonly scope: IntelligenceInstitutionalScopeService,
    private readonly consequentialAuthority: IntelligenceConsequentialAuthorityService,
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
  @ApiOperation({ summary: 'Performance measurement boundary metadata (public)' })
  getBoundary() {
    return this.boundary.boundaryMetadata();
  }

  @Get('twin-simulation/boundary')
  @ApiOperation({ summary: 'Digital twin and simulation boundary disclaimer (public)' })
  getTwinSimulationBoundaryDisclaimer(): { disclaimer: string } {
    return { disclaimer: PHASE_12F_BOUNDARY_DISCLAIMER };
  }

  @Post('frameworks')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  createFramework(@CurrentActor() actor: ActorContext, @Body() dto: CreatePerformanceFrameworkDto) {
    this.guardOperationalPayload(actor, dto as unknown as Record<string, unknown>);
    this.scope.assertInstitutionAccess(actor, dto.institutionId);
    return this.frameworkService.create(dto);
  }

  @Get('frameworks/:id')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async getFramework(@CurrentActor() actor: ActorContext, @Param('id', ParseUUIDPipe) id: string) {
    const framework = await this.frameworkService.findById(id);
    this.scope.assertInstitutionAccess(actor, framework.institutionId);
    return framework;
  }

  @Post('metrics')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  createMetric(@CurrentActor() actor: ActorContext, @Body() dto: CreateMetricDefinitionDto) {
    this.guardOperationalPayload(actor, dto as unknown as Record<string, unknown>);
    this.scope.assertInstitutionAccess(actor, dto.ownerInstitutionId);
    this.scope.assertDepartmentAccess(actor, dto.ownerDepartmentId);
    return this.metricDefinitionService.createDefinition(dto);
  }

  @Post('metrics/:id/versions')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async createMetricVersion(
    @CurrentActor() actor: ActorContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMetricDefinitionVersionDto,
  ) {
    this.guardOperationalPayload(actor, dto as unknown as Record<string, unknown>);
    const definition = await this.metricDefinitionService.findDefinitionById(id);
    this.scope.assertInstitutionAccess(actor, definition.ownerInstitutionId);
    return this.metricDefinitionService.createVersion(id, dto);
  }

  @Post('metrics/:id/publish')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async publishMetric(@CurrentActor() actor: ActorContext, @Param('id', ParseUUIDPipe) id: string) {
    const definition = await this.metricDefinitionService.findDefinitionById(id);
    this.scope.assertInstitutionAccess(actor, definition.ownerInstitutionId);
    return this.metricDefinitionService.publishDefinition(id);
  }

  @Post('metric-versions/:id/activate')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async activateMetricVersion(
    @CurrentActor() actor: ActorContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const version = await this.metricDefinitionService.findVersionById(id);
    const definition = await this.metricDefinitionService.findDefinitionById(
      version.metricDefinitionId,
    );
    this.scope.assertInstitutionAccess(actor, definition.ownerInstitutionId);
    return this.metricDefinitionService.activateVersion(id);
  }

  @Post('baselines')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async createBaseline(@CurrentActor() actor: ActorContext, @Body() dto: CreateMetricBaselineDto) {
    this.guardOperationalPayload(actor, dto as unknown as Record<string, unknown>);
    const version = await this.metricDefinitionService.findVersionById(dto.metricVersionId);
    const definition = await this.metricDefinitionService.findDefinitionById(
      version.metricDefinitionId,
    );
    this.scope.assertInstitutionAccess(actor, definition.ownerInstitutionId);
    return this.baselineService.create(dto);
  }

  @Post('calculation-runs')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async recordCalculationRun(
    @CurrentActor() actor: ActorContext,
    @Body() dto: RecordMetricCalculationRunDto,
  ) {
    this.guardOperationalPayload(actor, dto as unknown as Record<string, unknown>);
    const version = await this.metricDefinitionService.findVersionById(dto.metricVersionId);
    const definition = await this.metricDefinitionService.findDefinitionById(
      version.metricDefinitionId,
    );
    this.scope.assertInstitutionAccess(actor, definition.ownerInstitutionId);
    return this.calculationRunService.recordRun(dto, process.env.API_VERSION ?? 'v1');
  }

  @Post('claims')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  createClaim(@CurrentActor() actor: ActorContext, @Body() dto: CreatePerformanceClaimDto) {
    this.guardOperationalPayload(actor, dto as unknown as Record<string, unknown>);
    return this.claimService.create(dto, actor.identityId);
  }

  @Post('claims/:id/review')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async reviewClaim(
    @CurrentActor() actor: ActorContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewPerformanceClaimDto & { actorType?: string },
  ) {
    this.guardOperationalPayload(actor, dto as unknown as Record<string, unknown>);
    this.scope.assertAiActorCannotBypassActorContext(actor, 'reviewPerformanceClaim');
    this.scope.assertActorRoleMarkerNotAi(dto.actorType);
    await this.consequentialAuthority.assertConsequentialAuthority({ actor });
    return this.claimService.review(id, actor.identityId, dto, dto.actorType ?? 'HUMAN_REVIEWER');
  }

  @Post('digital-twins/definitions')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  createDefinition(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<DigitalTwinService['createDefinition']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    this.boundary.rejectClientProtectedFields(body as unknown as Record<string, unknown>);
    this.scope.assertInstitutionAccess(actor, body.institutionalOwnerId);
    return this.digitalTwin.createDefinition(body);
  }

  @Get('digital-twins/definitions/:id')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async getDefinition(@CurrentActor() actor: ActorContext, @Param('id') id: string) {
    const definition = await this.digitalTwin.findDefinitionById(id);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return definition;
  }

  @Post('digital-twins/versions')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async createVersion(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<DigitalTwinService['createVersion']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    const definition = await this.digitalTwin.findDefinitionById(body.definitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return this.digitalTwin.createVersion(body);
  }

  @Get('digital-twins/versions/:id')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async getVersion(@CurrentActor() actor: ActorContext, @Param('id') id: string) {
    const version = await this.digitalTwin.findVersionById(id);
    const definition = await this.digitalTwin.findDefinitionById(version.definitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return version;
  }

  @Post('digital-twins/sources')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async addSource(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<DigitalTwinService['addSource']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    const version = await this.digitalTwin.findVersionById(body.twinVersionId);
    const definition = await this.digitalTwin.findDefinitionById(version.definitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return this.digitalTwin.addSource({ ...body, ownerIdentityId: actor.identityId });
  }

  @Post('digital-twins/relationships')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async createRelationship(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<DigitalTwinService['createRelationship']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    const definition = await this.digitalTwin.findDefinitionById(body.fromDefinitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return this.digitalTwin.createRelationship(body);
  }

  @Post('digital-twins/modes')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async recordMode(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<DigitalTwinService['recordMode']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    const version = await this.digitalTwin.findVersionById(body.twinVersionId);
    const definition = await this.digitalTwin.findDefinitionById(version.definitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return this.digitalTwin.recordMode({ ...body, recordedByIdentityId: actor.identityId });
  }

  @Post('digital-twins/snapshots')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async createSnapshot(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<DigitalTwinService['createSnapshot']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    const version = await this.digitalTwin.findVersionById(body.twinVersionId);
    const definition = await this.digitalTwin.findDefinitionById(version.definitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return this.digitalTwin.createSnapshot(body);
  }

  @Post('simulations/scenarios')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async createScenario(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<SimulationService['createScenario']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    this.boundary.rejectClientProtectedFields(body as unknown as Record<string, unknown>);
    const version = await this.digitalTwin.findVersionById(body.twinVersionId);
    const definition = await this.digitalTwin.findDefinitionById(version.definitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return this.simulation.createScenario(body);
  }

  @Get('simulations/scenarios/:id')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async getScenario(@CurrentActor() actor: ActorContext, @Param('id') id: string) {
    const scenario = await this.simulation.findScenarioById(id);
    const version = await this.digitalTwin.findVersionById(scenario.twinVersionId);
    const definition = await this.digitalTwin.findDefinitionById(version.definitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return scenario;
  }

  @Post('simulations/runs')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async startRun(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<SimulationService['startRun']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    const version = await this.digitalTwin.findVersionById(body.twinVersionId);
    const definition = await this.digitalTwin.findDefinitionById(version.definitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return this.simulation.startRun(body);
  }

  @Post('simulations/runs/:id/outputs')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async recordOutput(
    @CurrentActor() actor: ActorContext,
    @Param('id') id: string,
    @Body() body: Omit<Parameters<SimulationService['recordOutput']>[0], 'simulationRunId'>,
  ) {
    this.guardOperationalPayload(actor, body);
    const run = await this.simulation.findRunById(id);
    const version = await this.digitalTwin.findVersionById(run.twinVersionId);
    const definition = await this.digitalTwin.findDefinitionById(version.definitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return this.simulation.recordOutput({ ...body, simulationRunId: id });
  }

  @Post('simulations/runs/:id/complete')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async completeRun(@CurrentActor() actor: ActorContext, @Param('id') id: string) {
    const run = await this.simulation.findRunById(id);
    const version = await this.digitalTwin.findVersionById(run.twinVersionId);
    const definition = await this.digitalTwin.findDefinitionById(version.definitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionalOwnerId);
    return this.simulation.completeRun(id);
  }

  @Post('consequential-use/reviews')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async recordReview(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<ConsequentialUseService['recordReview']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    this.boundary.rejectClientProtectedFields(body as unknown as Record<string, unknown>);
    this.scope.assertAiActorCannotBypassActorContext(actor, 'recordConsequentialUseReview');
    const version = await this.digitalTwin.findVersionById(body.twinVersionId);
    await this.consequentialAuthority.assertConsequentialAuthority({
      actor,
      institutionId: version.definition.institutionalOwnerId,
    });
    return this.consequentialUse.recordReview({
      ...body,
      reviewerIdentityId: actor.identityId,
      reviewerIdentityType: IdentityType.INDIVIDUAL,
      isAiActor: this.scope.isAiActor(actor),
    });
  }

  @Post('consequential-use/live-transitions')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async proposeLiveTransition(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<ConsequentialUseService['proposeLiveTransition']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    this.boundary.rejectClientProtectedFields(body as unknown as Record<string, unknown>);
    this.scope.assertAiActorCannotBypassActorContext(actor, 'proposeLiveTransition');
    const version = await this.digitalTwin.findVersionById(body.twinVersionId);
    await this.consequentialAuthority.assertConsequentialAuthority({
      actor,
      institutionId: version.definition.institutionalOwnerId,
    });
    return this.consequentialUse.proposeLiveTransition(body);
  }

  @Post('analysis/requests')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  createAnalysisRequest(
    @CurrentActor() actor: ActorContext,
    @Body() body: Omit<Parameters<AnalysisService['createRequest']>[0], 'requestedByIdentityId'>,
  ) {
    this.guardOperationalPayload(actor, body);
    this.scope.assertInstitutionAccess(actor, body.institutionId);
    return this.analysisService.createRequest({
      ...body,
      requestedByIdentityId: actor.identityId,
    });
  }

  @Post('analysis/runs')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async startAnalysisRun(
    @CurrentActor() actor: ActorContext,
    @Body() body: Omit<Parameters<AnalysisService['startRun']>[0], 'executedByIdentityId'>,
  ) {
    this.guardOperationalPayload(actor, body);
    const request = await this.analysisService.findRequestById(body.requestId);
    this.scope.assertInstitutionAccess(actor, request.institutionId);
    return this.analysisService.startRun({
      ...body,
      executedByIdentityId: actor.identityId,
    });
  }

  @Post('analysis/runs/:runId/complete')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async completeAnalysisRun(@CurrentActor() actor: ActorContext, @Param('runId') runId: string) {
    const run = await this.analysisService.findRunById(runId);
    this.scope.assertInstitutionAccess(actor, run.request.institutionId);
    return this.analysisService.completeRun(runId);
  }

  @Get('analysis/runs/:runId/replay')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async getAnalysisReplay(@CurrentActor() actor: ActorContext, @Param('runId') runId: string) {
    const run = await this.analysisService.findRunById(runId);
    this.scope.assertInstitutionAccess(actor, run.request.institutionId);
    if (run.request.case) {
      this.scope.assertInstitutionAccess(actor, run.request.case.responsibleInstitutionId);
      this.scope.assertDepartmentAccess(actor, run.request.case.responsibleDepartmentId);
    }
    return this.analysisService.getReplayableOutput(runId);
  }

  @Post('monitoring/rules')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  createMonitoringRule(
    @CurrentActor() actor: ActorContext,
    @Body()
    body: Omit<
      Parameters<IntelligenceMonitoringService['createRule']>[0],
      'ownerIdentityId' | 'reviewerIdentityId'
    >,
  ) {
    this.guardOperationalPayload(actor, body);
    this.scope.assertInstitutionAccess(actor, body.institutionId);
    return this.monitoringService.createRule({
      ...body,
      ownerIdentityId: actor.identityId,
      reviewerIdentityId: actor.identityId,
    });
  }

  @Post('monitoring/rules/:ruleId/activate')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async activateMonitoringRule(
    @CurrentActor() actor: ActorContext,
    @Param('ruleId') ruleId: string,
  ) {
    const rule = await this.monitoringService.findRuleById(ruleId);
    this.scope.assertInstitutionAccess(actor, rule.institutionId);
    return this.monitoringService.activateRule(ruleId);
  }

  @Post('monitoring/observations')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async recordObservation(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<IntelligenceMonitoringService['recordObservation']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    const rule = await this.monitoringService.findRuleById(body.ruleId);
    this.scope.assertInstitutionAccess(actor, rule.institutionId);
    return this.monitoringService.recordObservation(body);
  }

  @Post('monitoring/alerts')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async generateAlert(
    @CurrentActor() actor: ActorContext,
    @Body()
    body: Omit<
      Parameters<IntelligenceMonitoringService['generateAlert']>[0],
      'responsibleRecipientIdentityId'
    >,
  ) {
    this.guardOperationalPayload(actor, body);
    const rule = await this.monitoringService.findRuleById(body.ruleId);
    this.scope.assertInstitutionAccess(actor, rule.institutionId);
    return this.monitoringService.generateAlert({
      ...body,
      responsibleRecipientIdentityId: actor.identityId,
    });
  }

  @Post('monitoring/alerts/verify')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async verifyAlert(
    @CurrentActor() actor: ActorContext,
    @Body()
    body: Omit<Parameters<IntelligenceMonitoringService['verifyAlert']>[0], 'verifierIdentityId'>,
  ) {
    this.guardOperationalPayload(actor, body);
    this.scope.assertAiActorCannotBypassActorContext(actor, 'verifyAlert');
    const alert = await this.monitoringService.findAlertById(body.alertId);
    const rule = await this.monitoringService.findRuleById(alert.ruleId);
    this.scope.assertInstitutionAccess(actor, rule.institutionId);
    if (body.isConsequential) {
      await this.consequentialAuthority.assertConsequentialAuthority({
        actor,
        institutionId: rule.institutionId,
      });
    }
    return this.monitoringService.verifyAlert({
      ...body,
      verifierIdentityId: actor.identityId,
    });
  }

  @Post('monitoring/alerts/dispose')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async disposeAlert(
    @CurrentActor() actor: ActorContext,
    @Body()
    body: Omit<
      Parameters<IntelligenceMonitoringService['disposeAlert']>[0],
      'disposedByIdentityId'
    >,
  ) {
    this.guardOperationalPayload(actor, body);
    this.scope.assertAiActorCannotBypassActorContext(actor, 'disposeAlert');
    const alert = await this.monitoringService.findAlertById(body.alertId);
    const rule = await this.monitoringService.findRuleById(alert.ruleId);
    this.scope.assertInstitutionAccess(actor, rule.institutionId);
    return this.monitoringService.disposeAlert({
      ...body,
      disposedByIdentityId: actor.identityId,
    });
  }

  @Post('risk/definitions')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  createRiskDefinition(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<RiskAssessmentService['createDefinition']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    this.scope.assertInstitutionAccess(actor, body.institutionId);
    return this.riskService.createDefinition(body);
  }

  @Post('risk/assessments')
  @UseGuards(...INTELLIGENCE_ACTOR_GUARDS)
  @ApiBearerAuth()
  async createRiskAssessment(
    @CurrentActor() actor: ActorContext,
    @Body() body: Parameters<RiskAssessmentService['createAssessment']>[0],
  ) {
    this.guardOperationalPayload(actor, body as unknown as Record<string, unknown>);
    const definition = await this.riskService.findDefinitionById(body.definitionId);
    this.scope.assertInstitutionAccess(actor, definition.institutionId);
    return this.riskService.createAssessment(body);
  }

  private guardOperationalPayload(actor: ActorContext, payload: Record<string, unknown>): void {
    this.scope.rejectForgedActorIdentityFields(payload, actor);
    this.scope.rejectClientAuthorityIndicators(payload);
  }
}
