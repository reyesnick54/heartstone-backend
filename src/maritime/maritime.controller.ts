import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { MaritimeApplicationReferenceService } from './applications/maritime-application-reference.service';
import { MaritimeComplianceReferenceService } from './compliance/maritime-compliance-reference.service';
import { MaritimeConfigurationService } from './configuration/maritime-configuration.service';
import { MaritimeCustomsReferenceService } from './customs/maritime-customs-reference.service';
import { MaritimeExternalDependencyService } from './external/maritime-external-dependency.service';
import { MaritimeVesselInspectionService } from './inspections/maritime-vessel-inspection.service';
import { MaritimeInstrumentService } from './instruments/maritime-instrument.service';
import { VesselPartyRelationshipService } from './vessels/vessel-party-relationship.service';
import { VesselRecordService } from './vessels/vessel-record.service';

@ApiTags('maritime')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant:
    'Maritime administrative records and vessel identity do not authorize customs release or substitute external registration determinations',
})
@Controller('maritime')
export class MaritimeController {
  constructor(
    private readonly configurationService: MaritimeConfigurationService,
    private readonly vesselRecordService: VesselRecordService,
    private readonly partyRelationshipService: VesselPartyRelationshipService,
    private readonly applicationReferenceService: MaritimeApplicationReferenceService,
    private readonly externalDependencyService: MaritimeExternalDependencyService,
    private readonly instrumentService: MaritimeInstrumentService,
    private readonly inspectionService: MaritimeVesselInspectionService,
    private readonly customsReferenceService: MaritimeCustomsReferenceService,
    private readonly complianceReferenceService: MaritimeComplianceReferenceService,
  ) {}

  @Post('configurations')
  upsertConfiguration(
    @Body() body: Parameters<MaritimeConfigurationService['upsertConfiguration']>[0],
  ) {
    return this.configurationService.upsertConfiguration(body);
  }

  @Post('vessels')
  registerVessel(@Body() body: Parameters<VesselRecordService['registerVessel']>[0]) {
    return this.vesselRecordService.registerVessel(body);
  }

  @Post('vessels/:vesselRecordId/party-relationships')
  linkParty(
    @Param('vesselRecordId', ParseUUIDPipe) vesselRecordId: string,
    @Body()
    body: Omit<Parameters<VesselPartyRelationshipService['linkParty']>[0], 'vesselRecordId'>,
  ) {
    return this.partyRelationshipService.linkParty({ vesselRecordId, ...body });
  }

  @Post('vessels/:vesselRecordId/application-references')
  linkApplicationReference(
    @Param('vesselRecordId', ParseUUIDPipe) vesselRecordId: string,
    @Body()
    body: Omit<
      Parameters<MaritimeApplicationReferenceService['linkApplicationReference']>[0],
      'vesselRecordId'
    >,
  ) {
    return this.applicationReferenceService.linkApplicationReference({ vesselRecordId, ...body });
  }

  @Post('external-dependencies/record')
  recordExternalDependency(
    @Body()
    body: {
      actorPersona: Parameters<MaritimeExternalDependencyService['recordExternalDetermination']>[0];
      payload: Parameters<MaritimeExternalDependencyService['recordExternalDetermination']>[1];
    },
  ) {
    return this.externalDependencyService.recordExternalDetermination(
      body.actorPersona,
      body.payload,
    );
  }

  @Post('instruments/issue')
  issueInstrument(@Body() body: Parameters<MaritimeInstrumentService['issueInstrument']>[0]) {
    return this.instrumentService.issueInstrument(body);
  }

  @Post('vessels/:vesselRecordId/inspection-references')
  linkInspection(
    @Param('vesselRecordId', ParseUUIDPipe) vesselRecordId: string,
    @Body()
    body: Omit<
      Parameters<MaritimeVesselInspectionService['linkCanonicalInspection']>[0],
      'vesselRecordId'
    >,
  ) {
    return this.inspectionService.linkCanonicalInspection({ vesselRecordId, ...body });
  }

  @Post('customs-case-references')
  linkCustomsCase(
    @Body() body: Parameters<MaritimeCustomsReferenceService['linkCustomsOrPortCase']>[0],
  ) {
    return this.customsReferenceService.linkCustomsOrPortCase(body);
  }

  @Post('compliance-references')
  linkComplianceMatter(
    @Body() body: Parameters<MaritimeComplianceReferenceService['linkComplianceMatter']>[0],
  ) {
    return this.complianceReferenceService.linkComplianceMatter(body);
  }

  @Get('configurations/:jurisdictionId/vessel-type-categories/:code')
  @ApiOkResponse({ description: 'Resolve configurable vessel type category label' })
  resolveVesselTypeCategory(
    @Param('jurisdictionId', ParseUUIDPipe) jurisdictionId: string,
    @Param('code') code: string,
  ) {
    return this.configurationService.resolveVesselTypeCategoryLabel(jurisdictionId, code);
  }
}
