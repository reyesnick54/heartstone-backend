import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { OperationalAlertService } from './alerts/operational-alert.service';
import { CreateReliabilityDefinitionDto } from './dto/create-reliability-definition.dto';
import { CreateSloDto } from './dto/create-slo.dto';
import { ServiceHealthService } from './health/service-health.service';
import { PHASE_13C_BOUNDARY_DISCLAIMER } from './production-reliability.constants';
import { ServiceReliabilityService } from './reliability/service-reliability.service';
import { OperationalRunbookService } from './runbooks/operational-runbook.service';

@ApiTags('production-reliability')
@Controller('production-reliability')
export class ProductionReliabilityController {
  constructor(
    private readonly serviceHealthService: ServiceHealthService,
    private readonly serviceReliabilityService: ServiceReliabilityService,
    private readonly alertService: OperationalAlertService,
    private readonly runbookService: OperationalRunbookService,
  ) {}

  @Get('disclaimer')
  @ApiOperation({ summary: 'Return Phase 13C boundary disclaimer' })
  getDisclaimer(): { disclaimer: string } {
    return { disclaimer: PHASE_13C_BOUNDARY_DISCLAIMER };
  }

  @Get('service-health')
  @ApiOperation({
    summary: 'Assess technical service health (not institutional acceptance)',
  })
  @ApiOkResponse({ description: 'Technical health assessment with dependency checks' })
  async getServiceHealth() {
    return this.serviceHealthService.assessTechnicalHealth();
  }

  @Get('alert-disclaimer')
  @ApiOperation({ summary: 'Return operational alert disclaimer' })
  getAlertDisclaimer(): { disclaimer: string } {
    return { disclaimer: this.alertService.getAlertDisclaimer() };
  }

  @Post('definitions')
  @ApiOperation({ summary: 'Create a service reliability definition' })
  createDefinition(@Body() dto: CreateReliabilityDefinitionDto) {
    return this.serviceReliabilityService.createDefinition(dto);
  }

  @Post('objectives')
  @ApiOperation({ summary: 'Create a service level objective from approved targets' })
  createObjective(@Body() dto: CreateSloDto) {
    return this.serviceReliabilityService.createObjective(dto);
  }

  @Post('definitions/:id/seed-runbooks')
  @ApiOperation({ summary: 'Seed default operational runbooks for a reliability definition' })
  seedRunbooks(@Param('id') reliabilityDefinitionId: string) {
    return this.runbookService.seedDefaultRunbooks(reliabilityDefinitionId);
  }
}
