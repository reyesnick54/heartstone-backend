import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthorityActionType } from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { CANNABIS_AUTHORITY_FUNCTION_CODES } from './cannabis-administration.constants';
import { CannabisAdministrationAccessService } from './common/cannabis-administration-access.service';
import { CannabisAdministrationConfigurationService } from './configuration/cannabis-administration-configuration.service';
import { CannabisRegulatedEntityService } from './entities/cannabis-regulated-entity.service';
import { CannabisExternalDependencyService } from './external/cannabis-external-dependency.service';
import { CannabisLicenceRecordService } from './licences/cannabis-licence-record.service';
import { CannabisLicenceSuspensionService } from './licences/cannabis-licence-suspension.service';
import { CannabisRegulatoryReferenceService } from './regulatory/cannabis-regulatory-reference.service';
import { CannabisFacilitySiteReferenceService } from './sites/cannabis-facility-site-reference.service';

@ApiTags('cannabis-administration')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant:
    'Cannabis administration submissions and reviews do not confer lawful authority or licence outcomes',
})
@Controller('cannabis-administration')
@UseGuards(SessionAuthGuard, ConsequentialActionGuard)
@ApiBearerAuth()
export class CannabisAdministrationController {
  constructor(
    private readonly configurationService: CannabisAdministrationConfigurationService,
    private readonly regulatedEntityService: CannabisRegulatedEntityService,
    private readonly siteReferenceService: CannabisFacilitySiteReferenceService,
    private readonly licenceRecords: CannabisLicenceRecordService,
    private readonly licenceSuspensions: CannabisLicenceSuspensionService,
    private readonly externalDependencies: CannabisExternalDependencyService,
    private readonly regulatoryReferences: CannabisRegulatoryReferenceService,
    private readonly access: CannabisAdministrationAccessService,
  ) {}

  @Post('configurations')
  @ApiOkResponse({ description: 'Jurisdiction cannabis administration configuration upserted' })
  upsertConfiguration(
    @Body() body: Parameters<CannabisAdministrationConfigurationService['upsertConfiguration']>[0],
  ) {
    return this.configurationService.upsertConfiguration(body);
  }

  @Post('regulated-entities')
  registerRegulatedEntity(
    @Body() body: Parameters<CannabisRegulatedEntityService['registerRegulatedEntity']>[0],
  ) {
    return this.regulatedEntityService.registerRegulatedEntity(body);
  }

  @Post('regulated-entities/:regulatedEntityId/application-references')
  linkApplicationReference(
    @Param('regulatedEntityId', ParseUUIDPipe) regulatedEntityId: string,
    @Body()
    body: Omit<
      Parameters<CannabisRegulatedEntityService['linkApplicationReference']>[0],
      'regulatedEntityId'
    >,
  ) {
    return this.regulatedEntityService.linkApplicationReference({
      regulatedEntityId,
      ...body,
    });
  }

  @Post('regulated-entities/:regulatedEntityId/facility-sites')
  linkFacilitySite(
    @Param('regulatedEntityId', ParseUUIDPipe) regulatedEntityId: string,
    @Body()
    body: Omit<
      Parameters<CannabisFacilitySiteReferenceService['linkFacilitySite']>[0],
      'regulatedEntityId'
    >,
  ) {
    return this.siteReferenceService.linkFacilitySite({ regulatedEntityId, ...body });
  }

  @Post('licence-records/issue')
  @ConsequentialAction({
    functionCode: CANNABIS_AUTHORITY_FUNCTION_CODES.LICENCE_ISSUE,
    action: AuthorityActionType.ISSUE,
  })
  issueLicence(@Body() body: Parameters<CannabisLicenceRecordService['issueLicence']>[0]) {
    return this.licenceRecords.issueLicence(body);
  }

  @Post('licence-records/:id/suspend')
  @ConsequentialAction({
    functionCode: CANNABIS_AUTHORITY_FUNCTION_CODES.LICENCE_SUSPEND,
    action: AuthorityActionType.SUSPEND,
  })
  suspendLicence(
    @Param('id', ParseUUIDPipe) cannabisLicenceRecordId: string,
    @Body()
    body: Omit<
      Parameters<CannabisLicenceSuspensionService['suspendLicence']>[0],
      'cannabisLicenceRecordId'
    >,
  ) {
    return this.licenceSuspensions.suspendLicence({ cannabisLicenceRecordId, ...body });
  }

  @Post('external-dependencies/record')
  recordExternalDependency(
    @Body() body: Parameters<CannabisExternalDependencyService['recordExternalDependency']>[0],
  ) {
    return this.externalDependencies.recordExternalDependency(body);
  }

  @Post('compliance-references')
  linkComplianceMatter(
    @Body() body: Parameters<CannabisRegulatoryReferenceService['linkComplianceMatter']>[0],
  ) {
    return this.regulatoryReferences.linkComplianceMatter(body);
  }

  @Post('inspection-references')
  linkInspectionRecord(
    @Body() body: Parameters<CannabisRegulatoryReferenceService['linkInspectionRecord']>[0],
  ) {
    return this.regulatoryReferences.linkInspectionRecord(body);
  }

  @Get('configurations/:jurisdictionId/licence-categories/:code')
  resolveLicenceCategory(
    @Param('jurisdictionId', ParseUUIDPipe) jurisdictionId: string,
    @Param('code') code: string,
  ) {
    return this.configurationService.resolveLicenceCategoryLabel(jurisdictionId, code);
  }
}
