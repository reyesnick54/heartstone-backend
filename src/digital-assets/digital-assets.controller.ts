import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { DigitalAssetsAuthorizationService } from './authorization/digital-assets-authorization.service';
import { DigitalAssetsComplianceReferenceService } from './compliance/digital-assets-compliance-reference.service';
import { DigitalAssetsConfigurationService } from './configuration/digital-assets-configuration.service';
import { DigitalAssetsRegulatedEntityService } from './entities/digital-assets-regulated-entity.service';
import { DigitalAssetsExternalDependencyService } from './external/digital-assets-external-dependency.service';
import { DigitalAssetsTechnicalReviewService } from './reviews/digital-assets-technical-review.service';

@ApiTags('digital-assets')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant:
    'Digital-asset submissions and technical reviews do not confer authorization or licensing outcomes',
})
@Controller('digital-assets')
export class DigitalAssetsController {
  constructor(
    private readonly configurationService: DigitalAssetsConfigurationService,
    private readonly regulatedEntityService: DigitalAssetsRegulatedEntityService,
    private readonly technicalReviewService: DigitalAssetsTechnicalReviewService,
    private readonly externalDependencyService: DigitalAssetsExternalDependencyService,
    private readonly authorizationService: DigitalAssetsAuthorizationService,
    private readonly complianceReferenceService: DigitalAssetsComplianceReferenceService,
  ) {}

  @Post('configurations')
  @ApiOkResponse({ description: 'Jurisdiction digital-assets configuration upserted' })
  upsertConfiguration(
    @Body() body: Parameters<DigitalAssetsConfigurationService['upsertConfiguration']>[0],
  ) {
    return this.configurationService.upsertConfiguration(body);
  }

  @Post('regulated-entities')
  @ApiOkResponse({ description: 'Regulated entity reference registered' })
  registerRegulatedEntity(
    @Body() body: Parameters<DigitalAssetsRegulatedEntityService['registerRegulatedEntity']>[0],
  ) {
    return this.regulatedEntityService.registerRegulatedEntity(body);
  }

  @Post('regulated-entities/:regulatedEntityId/application-references')
  linkApplicationReference(
    @Param('regulatedEntityId', ParseUUIDPipe) regulatedEntityId: string,
    @Body()
    body: Omit<
      Parameters<DigitalAssetsRegulatedEntityService['linkApplicationReference']>[0],
      'regulatedEntityId'
    >,
  ) {
    return this.regulatedEntityService.linkApplicationReference({
      regulatedEntityId,
      ...body,
    });
  }

  @Post('regulated-entities/:regulatedEntityId/technical-reviews')
  openTechnicalReview(
    @Param('regulatedEntityId', ParseUUIDPipe) regulatedEntityId: string,
    @Body()
    body: Omit<
      Parameters<DigitalAssetsTechnicalReviewService['openReview']>[0],
      'regulatedEntityId'
    >,
  ) {
    return this.technicalReviewService.openReview({ regulatedEntityId, ...body });
  }

  @Post('authorizations/issue')
  @ApiOkResponse({ description: 'Digital-assets authorization issued under active authority' })
  issueAuthorization(
    @Body() body: Parameters<DigitalAssetsAuthorizationService['issueAuthorization']>[0],
  ) {
    return this.authorizationService.issueAuthorization(body);
  }

  @Post('external-dependencies/record')
  recordExternalDependency(
    @Body()
    body: {
      actorPersona: Parameters<DigitalAssetsExternalDependencyService['recordExternalResponse']>[0];
      payload: Parameters<DigitalAssetsExternalDependencyService['recordExternalResponse']>[1];
    },
  ) {
    return this.externalDependencyService.recordExternalResponse(body.actorPersona, body.payload);
  }

  @Post('compliance-references')
  linkComplianceMatter(
    @Body() body: Parameters<DigitalAssetsComplianceReferenceService['linkComplianceMatter']>[0],
  ) {
    return this.complianceReferenceService.linkComplianceMatter(body);
  }

  @Get('configurations/:jurisdictionId/activity-categories/:code')
  @ApiOkResponse({ description: 'Resolve configurable activity category label' })
  resolveActivityCategory(
    @Param('jurisdictionId', ParseUUIDPipe) jurisdictionId: string,
    @Param('code') code: string,
  ) {
    return this.configurationService.resolveActivityCategoryLabel(jurisdictionId, code);
  }
}
