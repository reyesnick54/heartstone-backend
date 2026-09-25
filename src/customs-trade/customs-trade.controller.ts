import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthorityActionType, CustomsActorPersona, CustomsDeclarationType } from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { CUSTOMS_TRADE_AUTHORITY_FUNCTION_CODES } from './customs-trade.constants';
import { CustomsDeclarationService } from './declarations/customs-declaration.service';
import { CustomsReleaseService } from './release/customs-release.service';

@ApiTags('customs-trade')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('customs-trade')
@UseGuards(SessionAuthGuard, ConsequentialActionGuard)
@ApiBearerAuth()
export class CustomsTradeController {
  constructor(
    private readonly declarationService: CustomsDeclarationService,
    private readonly releaseService: CustomsReleaseService,
  ) {}

  @Post('declarations')
  @ApiOkResponse({ description: 'Customs declaration submitted (does not release cargo)' })
  submitDeclaration(
    @Body()
    body: {
      traderAccountId: string;
      declarationType: CustomsDeclarationType;
      shipmentReferenceId?: string;
      submissionPayload?: Record<string, unknown>;
    },
  ) {
    return this.declarationService.submitDeclaration(body);
  }

  @Post('declarations/:id/amendments')
  @ApiOkResponse({ description: 'Amendment creates a new locked version; prior version preserved' })
  amendDeclaration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { submissionPayload?: Record<string, unknown> },
  ) {
    return this.declarationService.amendDeclaration({
      customsDeclarationId: id,
      submissionPayload: body.submissionPayload,
    });
  }

  @Post('shipments/:shipmentReferenceId/release')
  @ConsequentialAction({
    action: AuthorityActionType.APPROVE,
    functionCode: CUSTOMS_TRADE_AUTHORITY_FUNCTION_CODES.CARGO_RELEASE_AUTHORIZE,
  })
  @ApiOkResponse({ description: 'Authorize customs cargo release after authority evaluation' })
  authorizeRelease(
    @Param('shipmentReferenceId', ParseUUIDPipe) shipmentReferenceId: string,
    @Body()
    body: {
      authorizedByOfficeholderId: string;
      actorPersona?: CustomsActorPersona;
      actorRoleMarker?: string;
      releaseDecisionReferenceId?: string;
    },
  ) {
    return this.releaseService.authorizeRelease({
      shipmentReferenceId,
      authorizedByOfficeholderId: body.authorizedByOfficeholderId,
      actorPersona: body.actorPersona ?? CustomsActorPersona.CUSTOMS_OFFICER,
      actorRoleMarker: body.actorRoleMarker,
      releaseDecisionReferenceId: body.releaseDecisionReferenceId,
    });
  }
}
