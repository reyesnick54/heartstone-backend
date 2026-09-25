import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DEPARTMENT_EXPERIENCE_API_TAG } from '../../experience/department/department-experience.constants';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { CurrentActor } from '../../identity/auth/decorators/current-actor.decorator';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { DepartmentPlanningConstructionMetricsService } from './services/department-planning-construction-metrics.service';

@ApiTags(DEPARTMENT_EXPERIENCE_API_TAG)
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
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
