import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { type ActorContext } from '../identity/auth/context/actor-context.types';
import { CurrentActor } from '../identity/auth/decorators/current-actor.decorator';
import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { ServicePacksBoundaryService } from './common/service-packs-boundary.service';
import { CreateServicePackDto } from './packs/dto/create-service-pack.dto';
import { ImportServicePackManifestDto } from './packs/dto/import-service-pack-manifest.dto';
import { ServicePackResponseDto } from './packs/dto/service-pack-response.dto';
import { ServicePacksService } from './packs/service-packs.service';
import { ExportServicePackVersionDto } from './portability/dto/export-service-pack-version.dto';
import { ImportPortableServicePackDto } from './portability/dto/import-portable-service-pack.dto';
import { type PortableServicePackExportPackage } from './portability/portable-package.types';
import { ServicePackExportService } from './portability/service-pack-export.service';
import { ServicePackImportService } from './portability/service-pack-import.service';
import { ServicePackUpgradePlanService } from './registry/service-pack-upgrade-plan.service';
import { SERVICE_PACK_BOUNDARY_DISCLAIMER } from './service-packs.constants';
import { CloneServicePackTemplateDto } from './template/dto/clone-service-pack-template.dto';
import { ServicePackTemplateCloneService } from './template/service-pack-template-clone.service';
import { ServicePackValidationService } from './validation/service-pack-validation.service';
import { ServicePackVersionService } from './versions/service-pack-version.service';

@ApiTags('service-packs')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('service-packs')
@UseGuards(SessionAuthGuard)
export class ServicePacksController {
  constructor(
    private readonly boundary: ServicePacksBoundaryService,
    private readonly servicePacksService: ServicePacksService,
    private readonly validationService: ServicePackValidationService,
    private readonly versionService: ServicePackVersionService,
    private readonly exportService: ServicePackExportService,
    private readonly importService: ServicePackImportService,
    private readonly templateCloneService: ServicePackTemplateCloneService,
    private readonly upgradePlanService: ServicePackUpgradePlanService,
  ) {}

  @Get('boundary')
  @ApiOperation({ summary: 'Service pack governance boundary disclaimer' })
  getBoundaryDisclaimer(): { disclaimer: string } {
    return { disclaimer: SERVICE_PACK_BOUNDARY_DISCLAIMER };
  }

  @Get('manifest-versions')
  @ApiOperation({ summary: 'List supported manifest schema versions' })
  listManifestVersions(): { supportedVersions: readonly string[] } {
    return { supportedVersions: this.servicePacksService.supportedManifestVersions() };
  }

  @Post()
  @ApiOperation({ summary: 'Create a service pack identity' })
  @ApiCreatedResponse({ type: ServicePackResponseDto })
  create(@Body() body: CreateServicePackDto) {
    this.boundary.rejectClientProtectedVersionFields(body as unknown as Record<string, unknown>);
    return this.servicePacksService.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service pack by id' })
  getById(@Param('id') id: string) {
    return this.servicePacksService.findById(id);
  }

  @Post('portable-imports')
  @ApiOperation({ summary: 'Import a sanitized portable service pack export package' })
  importPortable(
    @Body() body: ImportPortableServicePackDto,
    @CurrentSession() session: SessionContextDto,
  ) {
    return this.importService.importPortablePackage(
      {
        targetServicePackId: body.targetServicePackId,
        targetInstitutionId: body.targetInstitutionId,
        targetJurisdictionId: body.targetJurisdictionId,
        package: body.package as unknown as PortableServicePackExportPackage,
      },
      session.identityId,
    );
  }

  @Post(':id/imports')
  @ApiOperation({ summary: 'Import a versioned manifest into a service pack' })
  importManifest(
    @Param('id') id: string,
    @Body() body: ImportServicePackManifestDto,
    @CurrentSession() session: SessionContextDto,
  ) {
    this.boundary.rejectClientProtectedVersionFields(body as unknown as Record<string, unknown>);
    this.boundary.assertValidationDoesNotCreateDecisions(body.manifest);
    return this.servicePacksService.importManifest(id, body, session.identityId);
  }

  @Post('versions/:versionId/validate')
  @ApiOperation({ summary: 'Validate a service pack version manifest' })
  @ApiOkResponse({ description: 'Validation result; does not deploy or activate services' })
  validateVersion(
    @Param('versionId') versionId: string,
    @CurrentSession() session: SessionContextDto,
  ) {
    return this.validationService.validateVersion({
      servicePackVersionId: versionId,
      validatedByIdentityId: session.identityId,
    });
  }

  @Post(':id/versions/:versionId/exports')
  @ApiOperation({ summary: 'Export a service pack version as a portable configuration package' })
  exportVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: ExportServicePackVersionDto,
    @CurrentActor() actor: ActorContext,
  ) {
    return this.exportService.exportVersion({
      servicePackId: id,
      servicePackVersionId: versionId,
      exportPurpose: body.exportPurpose,
      actor,
    });
  }

  @Post(':id/versions/:versionId/upgrade-plan')
  @ApiOperation({ summary: 'Dry-run upgrade analysis for a service pack version' })
  buildUpgradePlan(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.upgradePlanService.buildUpgradePlan({
      servicePackId: id,
      targetVersionId: versionId,
    });
  }

  @Post(':id/template-clones')
  @ApiOperation({ summary: 'Clone a service pack as a cross-jurisdiction template' })
  cloneTemplate(
    @Param('id') id: string,
    @Body() body: CloneServicePackTemplateDto,
    @CurrentSession() session: SessionContextDto,
  ) {
    return this.templateCloneService.cloneAsTemplate(
      {
        sourceServicePackId: id,
        sourceVersionId: body.sourceVersionId,
        targetInstitutionId: body.targetInstitutionId,
        targetJurisdictionId: body.targetJurisdictionId,
        targetPackCode: body.targetPackCode,
        targetPackName: body.targetPackName,
        responsibleOwnerIdentityId: body.responsibleOwnerIdentityId,
      },
      session.identityId,
    );
  }

  @Get('versions/:versionId')
  @ApiOperation({ summary: 'Get service pack version detail' })
  getVersion(@Param('versionId') versionId: string) {
    return this.versionService.findById(versionId);
  }

  @Patch('versions/:versionId')
  @ApiOperation({ summary: 'Update a draft service pack version' })
  updateVersion(
    @Param('versionId') versionId: string,
    @Body() body: { manifest?: Record<string, unknown> },
  ) {
    this.boundary.rejectClientProtectedVersionFields(body);
    return this.versionService.update(versionId, {
      manifest: body.manifest as never,
    });
  }
}
