import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { PublicVehicleVerificationService } from '../verification/public-vehicle-verification.service';

@ApiTags('transportation-public')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('api/v1/transportation/public')
export class PublicVehicleVerificationController {
  constructor(private readonly verificationService: PublicVehicleVerificationService) {}

  @Get('vehicles/verify/:publicVerificationToken')
  @ApiOkResponse({ description: 'Data-minimized public vehicle verification' })
  verifyVehicle(@Param('publicVerificationToken') publicVerificationToken: string) {
    return this.verificationService.verifyByPublicToken(publicVerificationToken);
  }
}
