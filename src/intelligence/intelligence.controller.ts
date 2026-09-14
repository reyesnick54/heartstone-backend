import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { IntelligenceBoundaryService } from './common/intelligence-boundary.service';
import { ConsequentialUseService } from './consequential-use/consequential-use.service';
import { DigitalTwinService } from './digital-twin/digital-twin.service';
import { PHASE_12F_BOUNDARY_DISCLAIMER } from './intelligence.constants';
import { SimulationService } from './simulation/simulation.service';

@Controller('intelligence')
export class IntelligenceController {
  constructor(
    private readonly boundary: IntelligenceBoundaryService,
    private readonly digitalTwin: DigitalTwinService,
    private readonly simulation: SimulationService,
    private readonly consequentialUse: ConsequentialUseService,
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
}
