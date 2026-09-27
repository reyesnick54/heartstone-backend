import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { Public } from '../../security/decorators/public.decorator';
import { RouteClass } from '../../security/route-class.enum';
import {
  type PublicLicenseVerificationResponse,
  type PublicOperatorVerificationResponse,
  PublicTransportationVerificationService,
} from './public-transportation-verification.service';

@ApiTags('public-transportation-verification')
@Public()
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('public/transportation')
export class PublicTransportationVerificationController {
  constructor(private readonly verification: PublicTransportationVerificationService) {}

  @Get('verify/license/:reference')
  @ApiOperation({ summary: 'Public driver license status verification (minimal facts)' })
  @ApiOkResponse({ description: 'Policy-permitted license status only' })
  verifyLicense(@Param('reference') reference: string): Promise<PublicLicenseVerificationResponse> {
    return this.verification.verifyLicenseReference(reference);
  }

  @Get('verify/vehicle/:reference')
  @ApiOperation({ summary: 'Public vehicle registration status verification' })
  verifyVehicle(@Param('reference') reference: string): Promise<Record<string, unknown>> {
    return this.verification.verifyVehicleRegistration(reference);
  }

  @Get('verify/operator/:reference')
  @ApiOperation({ summary: 'Public commercial transport operator permit status verification' })
  verifyOperator(
    @Param('reference') reference: string,
  ): Promise<PublicOperatorVerificationResponse> {
    return this.verification.verifyTransportOperator(reference);
  }
}
