import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DEPARTMENT_EXPERIENCE_API_TAG } from '../../experience/department/department-experience.constants';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { CurrentActor } from '../../identity/auth/decorators/current-actor.decorator';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { DepartmentPropertyProjectionService } from './services/department-property-projection.service';

@ApiTags(DEPARTMENT_EXPERIENCE_API_TAG)
@ApiBearerAuth()
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('experience/department')
export class DepartmentPropertyController {
  constructor(private readonly projections: DepartmentPropertyProjectionService) {}

  @Get(':departmentId/property-registry')
  @ApiOperation({ summary: 'Department property registry operational dashboard' })
  getPropertyRegistryDashboard(
    @CurrentActor() actor: ActorContext,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ) {
    return this.projections.buildDepartmentPropertyDashboard(actor, departmentId);
  }
}
