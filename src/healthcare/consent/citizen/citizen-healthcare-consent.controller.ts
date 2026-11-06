import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { CurrentActor } from '../../../identity/auth/decorators/current-actor.decorator';
import { CurrentSession } from '../../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../../security/route-class.enum';
import {
  CitizenHealthConsentGrantDto,
  CitizenHealthConsentsDto,
  GrantCitizenHealthConsentDto,
  WithdrawCitizenHealthConsentDto,
} from './citizen-healthcare-consent.dto';
import { CitizenHealthcareConsentService } from './citizen-healthcare-consent.service';

@ApiTags('citizen-healthcare-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
  authenticationRequired: true,
  scopeRequirement: 'Consent grants of the patient linked to the signed-in identity',
  authorityRequirement: 'None conferred: consent is the patient permission, not clinical authority',
  actorSource: 'Session identity resolved to its patient reference; never a client patient id',
  primarySecurityInvariant:
    'Consent != treatment authorization; withdrawal preserves the consent history',
})
@Controller('experience/citizen/healthcare/consents')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenHealthcareConsentController {
  constructor(private readonly consents: CitizenHealthcareConsentService) {}

  @Get()
  @ApiOperation({ summary: 'List your health consents and the purposes you can consent to' })
  @ApiOkResponse({ type: CitizenHealthConsentsDto })
  list(@CurrentSession() session: SessionContextDto): Promise<CitizenHealthConsentsDto> {
    return this.consents.list(session.identityId);
  }

  @Post()
  @ApiOperation({
    summary: 'Grant consent for a purpose',
    description:
      'Grants against the consent version currently in effect for the purpose. One active consent per purpose.',
  })
  @ApiCreatedResponse({ type: CitizenHealthConsentGrantDto })
  grant(
    @CurrentSession() session: SessionContextDto,
    @CurrentActor() actor: ActorContext,
    @Body() dto: GrantCitizenHealthConsentDto,
  ): Promise<CitizenHealthConsentGrantDto> {
    return this.consents.grant(session, actor, dto);
  }

  @Post(':grantId/withdraw')
  @ApiOperation({
    summary: 'Withdraw a consent you granted',
    description: 'Ends the grant from now on. The consent record and its history are kept.',
  })
  @ApiCreatedResponse({ type: CitizenHealthConsentGrantDto })
  withdraw(
    @CurrentSession() session: SessionContextDto,
    @CurrentActor() actor: ActorContext,
    @Param('grantId', ParseUUIDPipe) grantId: string,
    @Body() dto: WithdrawCitizenHealthConsentDto,
  ): Promise<CitizenHealthConsentGrantDto> {
    return this.consents.withdraw(session, actor, grantId, dto);
  }
}
