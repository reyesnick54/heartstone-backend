import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CorporateEntityType, CorporateOfficerRole } from '@prisma/client';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { CorporateRegistryActorAccessService } from './access/corporate-registry-actor-access.service';
import { CORPORATE_REGISTRY_API_TAG } from './corporate-registry.constants';
import { CorporateRegistryOperationsService } from './operations/corporate-registry-operations.service';

@ApiTags(CORPORATE_REGISTRY_API_TAG)
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Organization membership or representative authority',
  authorityRequirement: 'No client-forged registry approval',
  actorSource: 'Session identity',
  primarySecurityInvariant: 'Corporate registry mutations do not self-approve legal entity status',
})
@Controller('corporate-registry')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CorporateRegistryController {
  constructor(
    private readonly access: CorporateRegistryActorAccessService,
    private readonly operations: CorporateRegistryOperationsService,
  ) {}

  @Post('organizations/:organizationId/registration-intake')
  @ApiOkResponse({ description: 'Submit corporate registration intake (not activation)' })
  async submitRegistrationIntake(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body()
    body: {
      registeredName?: string;
      entityType?: CorporateEntityType;
      jurisdictionCode?: string;
    },
  ) {
    await this.access.assertOrganizationWriteAccess(organizationId, session.identityId, 'GENERAL');
    return this.operations.submitRegistrationIntake({
      organizationId,
      actorIdentityId: session.identityId,
      registeredName: body.registeredName,
      entityType: body.entityType,
      jurisdictionCode: body.jurisdictionCode,
    });
  }

  @Get('organizations/:organizationId/status')
  @ApiOkResponse({ description: 'Corporate entity status and structured beneficial ownership' })
  async getStatus(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    const access = await this.access.assertOrganizationWriteAccess(
      organizationId,
      session.identityId,
      'GENERAL',
    );
    return this.operations.getEntityStatus(organizationId, access.hasActiveMembership);
  }

  @Post('organizations/:organizationId/amendments')
  async submitAmendment(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() body: { label: string },
  ) {
    await this.access.assertOrganizationWriteAccess(organizationId, session.identityId, 'GENERAL');
    return this.operations.submitAmendment({
      organizationId,
      actorIdentityId: session.identityId,
      label: body.label,
    });
  }

  @Post('organizations/:organizationId/officers')
  async submitOfficer(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body()
    body: {
      displayName: string;
      role: CorporateOfficerRole;
      permitsPublicDisclosure?: boolean;
    },
  ) {
    await this.access.assertOrganizationWriteAccess(organizationId, session.identityId, 'GENERAL');
    return this.operations.submitOfficerDisclosure({
      organizationId,
      displayName: body.displayName,
      role: body.role,
      permitsPublicDisclosure: body.permitsPublicDisclosure,
    });
  }

  @Post('organizations/:organizationId/registered-office')
  async submitRegisteredOffice(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() body: { addressLine1: string; city?: string; countryCode?: string },
  ) {
    await this.access.assertOrganizationWriteAccess(organizationId, session.identityId, 'GENERAL');
    return this.operations.submitRegisteredOfficeChange({
      organizationId,
      addressLine1: body.addressLine1,
      city: body.city,
      countryCode: body.countryCode,
    });
  }

  @Post('organizations/:organizationId/beneficial-ownership')
  async submitBeneficialOwnership(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body()
    body: {
      owners: {
        ownerReference: string;
        controlNature: 'OWNERSHIP' | 'CONTROL' | 'BOTH';
        ownershipPercentage?: number;
        subjectPersonId?: string;
        subjectOrganizationId?: string;
        provenanceSource: string;
      }[];
    },
  ) {
    await this.access.assertOrganizationWriteAccess(
      organizationId,
      session.identityId,
      'BENEFICIAL_OWNERSHIP',
    );
    return this.operations.submitBeneficialOwnership({
      organizationId,
      actorIdentityId: session.identityId,
      owners: body.owners,
    });
  }
}
