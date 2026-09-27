import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';
import { ControllerRouteAccess } from './security/decorators/controller-route-access.decorator';
import { Public } from './security/decorators/public.decorator';
import { RouteClass } from './security/route-class.enum';

@ControllerRouteAccess({
  routeClass: RouteClass.SYSTEM_HEALTH,
  authenticationRequired: false,
  scopeRequirement: "Process and dependency health probes",
  authorityRequirement: "None",
  actorSource: "Anonymous monitor",
  primarySecurityInvariant: "Health endpoints expose no protected domain data",
})
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
