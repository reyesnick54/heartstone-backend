import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { Public } from '../../security/decorators/public.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { CivilRegistryVerificationService } from './civil-registry-verification.service';

@ApiTags('public-civil-registry')
@Public()
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('public/civil-registry')
export class PublicCivilRegistryVerificationController {
  constructor(private readonly verificationService: CivilRegistryVerificationService) {}

  @Get('verify/:verificationCode')
  @ApiOperation({
    summary: 'Publicly verify an issued civil certificate by opaque verification code',
  })
  @ApiOkResponse({ description: 'Minimal non-sensitive verification fields only' })
  verifyByCode(@Param('verificationCode') verificationCode: string) {
    return this.verificationService.verifyPublic(verificationCode);
  }

  @Get('verify-reference/:verificationReference')
  @ApiOperation({
    summary: 'Publicly verify an issued civil certificate by verification reference',
  })
  verifyByReference(@Param('verificationReference') verificationReference: string) {
    return this.verificationService.verifyByReference(verificationReference);
  }
}
