import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { CarbonAdministrativeAuthorizationService } from './authorization/carbon-administrative-authorization.service';
import { CarbonManagementComplianceReferenceService } from './compliance/carbon-management-compliance-reference.service';
import { CarbonManagementConfigurationService } from './configuration/carbon-management-configuration.service';
import { CarbonProgrammeService } from './programmes/carbon-programme.service';
import { CarbonProjectService } from './projects/carbon-project.service';
import { CarbonRegistryReferenceService } from './registry/carbon-registry-reference.service';
import { CarbonExternalVerificationService } from './verification/carbon-external-verification.service';

@ApiTags('carbon-management')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant:
    'Carbon programme submissions and external verification evidence do not confer government approval or trading authorization',
})
@Controller('carbon-management')
export class CarbonManagementController {
  constructor(
    private readonly configurationService: CarbonManagementConfigurationService,
    private readonly programmeService: CarbonProgrammeService,
    private readonly projectService: CarbonProjectService,
    private readonly externalVerificationService: CarbonExternalVerificationService,
    private readonly registryReferenceService: CarbonRegistryReferenceService,
    private readonly authorizationService: CarbonAdministrativeAuthorizationService,
    private readonly complianceReferenceService: CarbonManagementComplianceReferenceService,
  ) {}

  @Post('configurations')
  @ApiOkResponse({ description: 'Jurisdiction carbon-management configuration upserted' })
  upsertConfiguration(
    @Body() body: Parameters<CarbonManagementConfigurationService['upsertConfiguration']>[0],
  ) {
    return this.configurationService.upsertConfiguration(body);
  }

  @Post('programmes')
  registerProgramme(@Body() body: Parameters<CarbonProgrammeService['registerProgramme']>[0]) {
    return this.programmeService.registerProgramme(body);
  }

  @Post('projects')
  registerProject(@Body() body: Parameters<CarbonProjectService['registerProject']>[0]) {
    return this.projectService.registerProject(body);
  }

  @Post('projects/:carbonProjectId/application-references')
  linkApplicationReference(
    @Param('carbonProjectId', ParseUUIDPipe) carbonProjectId: string,
    @Body()
    body: Omit<Parameters<CarbonProjectService['linkApplicationReference']>[0], 'carbonProjectId'>,
  ) {
    return this.projectService.linkApplicationReference({ carbonProjectId, ...body });
  }

  @Post('projects/:carbonProjectId/external-verifications')
  recordExternalVerification(
    @Param('carbonProjectId', ParseUUIDPipe) carbonProjectId: string,
    @Body()
    body: {
      actorPersona: Parameters<CarbonExternalVerificationService['recordVerification']>[0];
      payload: Omit<
        Parameters<CarbonExternalVerificationService['recordVerification']>[1],
        'carbonProjectId'
      >;
    },
  ) {
    return this.externalVerificationService.recordVerification(body.actorPersona, {
      carbonProjectId,
      ...body.payload,
    });
  }

  @Post('projects/:carbonProjectId/registry-references')
  recordRegistryReference(
    @Param('carbonProjectId', ParseUUIDPipe) carbonProjectId: string,
    @Body()
    body: Omit<
      Parameters<CarbonRegistryReferenceService['recordRegistryReference']>[0],
      'carbonProjectId'
    >,
  ) {
    return this.registryReferenceService.recordRegistryReference({ carbonProjectId, ...body });
  }

  @Post('authorizations/issue')
  @ApiOkResponse({
    description: 'Carbon administrative authorization issued under active authority',
  })
  issueAuthorization(
    @Body() body: Parameters<CarbonAdministrativeAuthorizationService['issueAuthorization']>[0],
  ) {
    return this.authorizationService.issueAuthorization(body);
  }

  @Post('compliance-references')
  linkComplianceMatter(
    @Body() body: Parameters<CarbonManagementComplianceReferenceService['linkComplianceMatter']>[0],
  ) {
    return this.complianceReferenceService.linkComplianceMatter(body);
  }

  @Get('configurations/:jurisdictionId/project-categories/:code')
  @ApiOkResponse({ description: 'Resolve configurable project category label' })
  resolveProjectCategory(
    @Param('jurisdictionId', ParseUUIDPipe) jurisdictionId: string,
    @Param('code') code: string,
  ) {
    return this.configurationService.resolveProjectCategoryLabel(jurisdictionId, code);
  }
}
