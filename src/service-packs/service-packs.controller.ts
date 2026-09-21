import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ServicePacksBoundaryService } from './common/service-packs-boundary.service';
import { CreateServicePackDto } from './packs/dto/create-service-pack.dto';
import { ImportServicePackManifestDto } from './packs/dto/import-service-pack-manifest.dto';
import { ServicePackResponseDto } from './packs/dto/service-pack-response.dto';
import { ServicePacksService } from './packs/service-packs.service';
import { SERVICE_PACK_BOUNDARY_DISCLAIMER } from './service-packs.constants';
import { ServicePackValidationService } from './validation/service-pack-validation.service';
import { ServicePackVersionService } from './versions/service-pack-version.service';

@ApiTags('service-packs')
@Controller('service-packs')
@UseGuards(SessionAuthGuard)
export class ServicePacksController {
  constructor(
    private readonly boundary: ServicePacksBoundaryService,
    private readonly servicePacksService: ServicePacksService,
    private readonly validationService: ServicePackValidationService,
    private readonly versionService: ServicePackVersionService,
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
