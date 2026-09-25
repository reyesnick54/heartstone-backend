import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { PublicEducationVerificationService } from './public-education-verification.service';

@ApiTags('education-public-verification')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('api/v1/public/education')
export class PublicEducationVerificationController {
  constructor(private readonly verificationService: PublicEducationVerificationService) {}

  @Get('credentials/:credentialReference/verify')
  @ApiOkResponse({ description: 'Minimal public credential verification' })
  verifyCredential(@Param('credentialReference') credentialReference: string) {
    return this.verificationService.verifyCredentialPublicly(credentialReference);
  }
}
