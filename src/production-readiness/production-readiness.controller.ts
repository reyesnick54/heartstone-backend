import { Controller, Get } from '@nestjs/common';

import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { Public } from '../security/decorators/public.decorator';
import { RouteClass } from '../security/route-class.enum';
import {
  PHASE_13_BOUNDARY_DISCLAIMERS,
  PRODUCTION_READINESS_BOUNDARY_DISCLAIMER,
} from './production-readiness.constants';

@ControllerRouteAccess({
  routeClass: RouteClass.PUBLIC,
  authenticationRequired: false,
  scopeRequirement: "Public boundary disclaimer consumption",
  authorityRequirement: "None",
  actorSource: "Anonymous reader",
  primarySecurityInvariant: "Boundary disclaimers are informational only",
})
@Controller('production-readiness')
export class ProductionReadinessController {
  @Public()
  @Get('boundary-disclaimer')
  getBoundaryDisclaimer(): {
    disclaimer: string;
    invariants: typeof PHASE_13_BOUNDARY_DISCLAIMERS;
  } {
    return {
      disclaimer: PRODUCTION_READINESS_BOUNDARY_DISCLAIMER,
      invariants: PHASE_13_BOUNDARY_DISCLAIMERS,
    };
  }
}
