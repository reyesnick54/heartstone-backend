import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  AuthorityActionType,
  FinancialServicesActorPersona,
} from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { FinancialLicenceApplicationProfileService } from './applications/financial-licence-application-profile.service';
import { FinancialServicesAccessService } from './common/financial-services-access.service';
import { FinancialExternalRegulatoryDependencyService } from './external/financial-external-regulatory-dependency.service';
import { FINANCIAL_SERVICES_AUTHORITY_FUNCTION_CODES } from './financial-services.constants';
import { FinancialLicenceRecordService } from './licences/financial-licence-record.service';
import { FinancialLicenceSuspensionService } from './licences/financial-licence-suspension.service';
import { FinancialRegulatedEntityProfileService } from './profiles/financial-regulated-entity-profile.service';
import { FinancialRegulatoryReferenceService } from './regulatory/financial-regulatory-reference.service';
import { FinancialServicesOperationalMetricsService } from './reporting/financial-services-operational-metrics.service';

@ApiTags('financial-services')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant: 'Application and submission endpoints do not confer official outcomes',
})
@Controller('financial-services')
@UseGuards(ConsequentialActionGuard)
@ApiBearerAuth()
export class FinancialServicesController {
  constructor(
    private readonly regulatedEntities: FinancialRegulatedEntityProfileService,
    private readonly applicationProfiles: FinancialLicenceApplicationProfileService,
    private readonly licenceRecords: FinancialLicenceRecordService,
    private readonly licenceSuspensions: FinancialLicenceSuspensionService,
    private readonly externalDependencies: FinancialExternalRegulatoryDependencyService,
    private readonly regulatoryReferences: FinancialRegulatoryReferenceService,
    private readonly access: FinancialServicesAccessService,
    private readonly metrics: FinancialServicesOperationalMetricsService,
  ) {}

  @Post('regulated-entities')
  @ApiOkResponse({ description: 'Financial regulated entity profile registered (canonical organization)' })
  registerRegulatedEntity(
    @Body() body: Parameters<FinancialRegulatedEntityProfileService['registerRegulatedEntity']>[0],
  ) {
    return this.regulatedEntities.registerRegulatedEntity(body);
  }

  @Post('regulated-entities/:id/beneficial-ownership-linkages')
  linkBeneficialOwnership(
    @Param('id', ParseUUIDPipe) regulatedEntityProfileId: string,
    @Body()
    body: Omit<
      Parameters<FinancialRegulatedEntityProfileService['linkBeneficialOwnershipReference']>[0],
      'regulatedEntityProfileId'
    >,
  ) {
    return this.regulatedEntities.linkBeneficialOwnershipReference({
      regulatedEntityProfileId,
      ...body,
    });
  }

  @Post('licence-application-profiles')
  linkLicenceApplicationProfile(
    @Body()
    body: Parameters<FinancialLicenceApplicationProfileService['linkApplicationProfile']>[0],
  ) {
    return this.applicationProfiles.linkApplicationProfile(body);
  }

  @Post('licence-records/issue')
  @ConsequentialAction({
    functionCode: FINANCIAL_SERVICES_AUTHORITY_FUNCTION_CODES.LICENCE_ISSUE,
    action: AuthorityActionType.ISSUE,
  })
  issueLicence(@Body() body: Parameters<FinancialLicenceRecordService['issueLicence']>[0]) {
    return this.licenceRecords.issueLicence(body);
  }

  @Post('licence-records/:id/status')
  recordLicenceStatus(
    @Param('id', ParseUUIDPipe) financialLicenceRecordId: string,
    @Body()
    body: Omit<
      Parameters<FinancialLicenceRecordService['recordStatusTransition']>[0],
      'financialLicenceRecordId'
    >,
  ) {
    return this.licenceRecords.recordStatusTransition({
      financialLicenceRecordId,
      ...body,
    });
  }

  @Post('licence-records/:id/suspend')
  @ConsequentialAction({
    functionCode: FINANCIAL_SERVICES_AUTHORITY_FUNCTION_CODES.LICENCE_SUSPEND,
    action: AuthorityActionType.SUSPEND,
  })
  suspendLicence(
    @Param('id', ParseUUIDPipe) financialLicenceRecordId: string,
    @Body()
    body: Omit<Parameters<FinancialLicenceSuspensionService['suspendLicence']>[0], 'financialLicenceRecordId'>,
  ) {
    return this.licenceSuspensions.suspendLicence({ financialLicenceRecordId, ...body });
  }

  @Post('external-regulatory-dependencies')
  recordExternalDependency(
    @Body()
    body: {
      actorPersona: FinancialServicesActorPersona;
      payload: Parameters<FinancialExternalRegulatoryDependencyService['recordExternalDependency']>[1];
    },
  ) {
    return this.externalDependencies.recordExternalDependency(body.actorPersona, body.payload);
  }

  @Post('regulated-entities/:id/compliance-matters')
  linkComplianceMatter(
    @Param('id', ParseUUIDPipe) regulatedEntityProfileId: string,
    @Body()
    body: Omit<
      Parameters<FinancialRegulatoryReferenceService['linkComplianceMatter']>[0],
      'regulatedEntityProfileId'
    >,
  ) {
    return this.regulatoryReferences.linkComplianceMatter({ regulatedEntityProfileId, ...body });
  }

  @Post('organizations/:organizationId/regulatory-profile/query')
  async getOrganizationRegulatoryProfile(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body()
    body: {
      accessorIdentityId: string;
      actorPersona: FinancialServicesActorPersona;
      financialOfficerAuthorized?: boolean;
      representativeAuthorityId?: string;
    },
  ) {
    const profile = await this.regulatedEntities.getProfileForOrganization(organizationId);
    await this.access.assertRegulatedEntityAccess({
      accessorIdentityId: body.accessorIdentityId,
      regulatedEntityProfileId: profile.id,
      actorPersona: body.actorPersona,
      endpoint: 'GET /financial-services/organizations/:organizationId/regulatory-profile',
      financialOfficerAuthorized: body.financialOfficerAuthorized,
      representativeAuthorityId: body.representativeAuthorityId,
    });
    return profile;
  }

  @Post('jurisdictions/:jurisdictionId/operational-snapshots')
  computeOperationalSnapshot(
    @Param('jurisdictionId', ParseUUIDPipe) jurisdictionId: string,
    @Body() body: { periodStart: string; periodEnd: string },
  ) {
    return this.metrics.computeJurisdictionSnapshot({
      jurisdictionId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
    });
  }
}
