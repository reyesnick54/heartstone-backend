import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { Public } from '../../security/decorators/public.decorator';
import { RouteClass } from '../../security/route-class.enum';
import {
  type PublicCustomsTradeVerificationResponse,
  PublicCustomsTradeVerificationService,
} from './public-customs-trade-verification.service';

@ApiTags('customs-trade')
@Public()
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('public/customs-trade')
export class PublicCustomsTradeVerificationController {
  constructor(private readonly verificationService: PublicCustomsTradeVerificationService) {}

  @Get('verify/:reference')
  @ApiOperation({
    summary: 'Public customs trade profile verification (non-confidential facts only)',
  })
  @ApiOkResponse({ description: 'Policy-permitted customs trade facts only' })
  verify(@Param('reference') reference: string): Promise<PublicCustomsTradeVerificationResponse> {
    return this.verificationService.verify(reference);
  }
}
