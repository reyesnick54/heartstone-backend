import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AbsezZoneEnterpriseActorPersona,
  AuthorityActionType,
} from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES } from './absez.constants';
import { SezBusinessLicenceService } from './sez-licence/sez-business-licence.service';
import { ZoneEnterpriseService } from './zone-enterprise/zone-enterprise.service';

@ApiTags('absez')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for SEZ licence outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant: 'Intake and payment do not issue SEZ licences without authorized decisions',
})
@Controller('absez')
@UseGuards(SessionAuthGuard, ConsequentialActionGuard)
@ApiBearerAuth()
export class AbsezController {
  constructor(
    private readonly zoneEnterpriseService: ZoneEnterpriseService,
    private readonly sezLicenceService: SezBusinessLicenceService,
  ) {}

  @Get('organizations/:organizationId/institutions/:institutionId/zone-enterprise')
  @ApiOkResponse({ description: 'Zone enterprise linked to registered organization' })
  getZoneEnterprise(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
  ) {
    return this.zoneEnterpriseService.getZoneEnterpriseForOrganization(organizationId, institutionId);
  }

  @Post('organizations/:organizationId/institutions/:institutionId/sez-licences/intake')
  @ApiOkResponse({ description: 'SEZ licence intake (does not issue licence)' })
  createLicenceIntake(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('institutionId', ParseUUIDPipe) institutionId: string,
    @Body()
    body: {
      applicationId?: string;
      caseId?: string;
      approvedActivityCategoryCodes?: string[];
    },
  ) {
    return this.sezLicenceService.createLicenceIntake({
      organizationId,
      institutionId,
      applicationId: body.applicationId,
      caseId: body.caseId,
      approvedActivityCategoryCodes: body.approvedActivityCategoryCodes,
      actorIdentityId: session.identityId,
    });
  }

  @Post('sez-licences/:licenceId/payments')
  @ApiOkResponse({ description: 'Record SEZ licence fee payment (does not approve)' })
  recordPayment(
    @Param('licenceId', ParseUUIDPipe) licenceId: string,
    @Body()
    body: {
      paymentReference: string;
      amount: number;
      currencyCode: string;
      actorPersona?: AbsezZoneEnterpriseActorPersona;
    },
  ) {
    return this.sezLicenceService.recordPaymentReceived({
      sezBusinessLicenceId: licenceId,
      paymentReference: body.paymentReference,
      amount: body.amount,
      currencyCode: body.currencyCode,
      actorPersona: body.actorPersona ?? AbsezZoneEnterpriseActorPersona.PAYMENT_SYSTEM,
    });
  }

  @Post('sez-licences/:licenceId/issue')
  @ConsequentialAction({
    action: AuthorityActionType.ISSUE,
    functionCode: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.ISSUE,
  })
  @ApiOkResponse({ description: 'Issue SEZ business licence after authorized decision' })
  issueLicence(
    @CurrentSession() session: SessionContextDto,
    @Param('licenceId', ParseUUIDPipe) licenceId: string,
    @Body()
    body: {
      governmentDecisionId: string;
      officialInstrumentId: string;
      effectiveFrom?: string;
      effectiveUntil?: string;
      actorPersona?: AbsezZoneEnterpriseActorPersona;
    },
  ) {
    return this.sezLicenceService.issueLicenceAfterDecision({
      sezBusinessLicenceId: licenceId,
      governmentDecisionId: body.governmentDecisionId,
      officialInstrumentId: body.officialInstrumentId,
      actorIdentityId: session.identityId,
      actorPersona: body.actorPersona ?? AbsezZoneEnterpriseActorPersona.LICENSING_OFFICER,
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : undefined,
      effectiveUntil: body.effectiveUntil ? new Date(body.effectiveUntil) : undefined,
    });
  }

  @Post('sez-licences/:licenceId/suspend')
  @ConsequentialAction({
    action: AuthorityActionType.SUSPEND,
    functionCode: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.SUSPEND,
  })
  suspendLicence(
    @CurrentSession() session: SessionContextDto,
    @Param('licenceId', ParseUUIDPipe) licenceId: string,
    @Body()
    body: {
      governmentDecisionId: string;
      officialInstitutionId: string;
      actorPersona?: AbsezZoneEnterpriseActorPersona;
    },
  ) {
    return this.sezLicenceService.suspendLicence({
      sezBusinessLicenceId: licenceId,
      governmentDecisionId: body.governmentDecisionId,
      officialInstitutionId: body.officialInstitutionId,
      actorIdentityId: session.identityId,
      actorPersona: body.actorPersona ?? AbsezZoneEnterpriseActorPersona.LICENSING_OFFICER,
      summary: 'SEZ business licence suspended by consequential authority',
    });
  }

  @Post('sez-licences/:licenceId/revoke')
  @ConsequentialAction({
    action: AuthorityActionType.REVOKE,
    functionCode: ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.REVOKE,
  })
  revokeLicence(
    @CurrentSession() session: SessionContextDto,
    @Param('licenceId', ParseUUIDPipe) licenceId: string,
    @Body()
    body: {
      governmentDecisionId: string;
      officialInstitutionId: string;
      actorPersona?: AbsezZoneEnterpriseActorPersona;
    },
  ) {
    return this.sezLicenceService.revokeLicence({
      sezBusinessLicenceId: licenceId,
      governmentDecisionId: body.governmentDecisionId,
      officialInstitutionId: body.officialInstitutionId,
      actorIdentityId: session.identityId,
      actorPersona: body.actorPersona ?? AbsezZoneEnterpriseActorPersona.LICENSING_OFFICER,
      summary: 'SEZ business licence revoked by consequential authority',
    });
  }
}
