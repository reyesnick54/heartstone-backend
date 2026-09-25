import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { Public } from '../../security/decorators/public.decorator';
import { RouteClass } from '../../security/route-class.enum';
import {
  InstrumentVerificationService,
  PublicInstrumentVerificationResponse,
} from './instrument-verification.service';

@ApiTags('public-instruments')
@Public()
@ControllerRouteAccess({
  routeClass: RouteClass.CONSEQUENTIAL_AUTHORITY_CONTROLLED,
  authenticationRequired: true,
  scopeRequirement: "Issuance readiness and official instrument issuance scope",
  authorityRequirement: "Function authority ISSUE evaluation via ConsequentialActionGuard",
  actorSource: "Session identity with evaluated issuer authority context",
  primarySecurityInvariant: "Issuance requires explicit authority evaluation, not authentication alone",
})
@Controller('public/instruments')
export class PublicInstrumentVerificationController {
  constructor(private readonly verificationService: InstrumentVerificationService) {}

  @Get('verify/:verificationCode')
  @ApiOperation({
    summary: 'Publicly verify an issued instrument by opaque verification code',
  })
  @ApiOkResponse({ description: 'Approved non-sensitive verification fields only' })
  verify(
    @Param('verificationCode') verificationCode: string,
  ): Promise<PublicInstrumentVerificationResponse> {
    return this.verificationService.verifyPublic(verificationCode);
  }
}
