import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DEPARTMENT_EXPERIENCE_API_TAG } from '../../experience/department/department-experience.constants';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { CurrentActor } from '../../identity/auth/decorators/current-actor.decorator';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { DepartmentPlanningConstructionMetricsService } from './services/department-planning-construction-metrics.service';

@ApiTags(DEPARTMENT_EXPERIENCE_API_TAG)
@Controller('experience/department')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class DepartmentPlanningConstructionController {
  constructor(private readonly metricsService: DepartmentPlanningConstructionMetricsService) {}

  @Get(':departmentId/planning-construction')
  @ApiOperation({
    summary: 'Planning and construction department metrics (non-determinative indicators)',
  })
  getPlanningConstructionMetrics(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ) {
    return this.metricsService.buildMetrics(actor, departmentId);
  }
}
