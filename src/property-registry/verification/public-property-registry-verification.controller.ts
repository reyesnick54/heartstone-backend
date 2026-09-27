import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { Public } from '../../security/decorators/public.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { PublicPropertyRegistryVerificationService } from './public-property-registry-verification.service';

@ApiTags('public-property-registry')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('public/property-registry')
export class PublicPropertyRegistryVerificationController {
  constructor(private readonly verificationService: PublicPropertyRegistryVerificationService) {}

  @Public()
  @Get('verify/:reference')
  @ApiOperation({
    summary: 'Controlled public property registry lookup when enabled by jurisdiction',
  })
  @ApiOkResponse({ description: 'Minimal public verification facts' })
  verify(@Param('reference') reference: string) {
    return this.verificationService.verify(reference);
  }
}
