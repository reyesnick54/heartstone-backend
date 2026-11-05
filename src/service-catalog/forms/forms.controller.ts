import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { CreateFormDefinitionDto } from './dto/create-form-definition.dto';
import {
  CreateFormVersionDto,
  CreateNextFormVersionDto,
  UpdateDraftFormVersionDto,
  ValidateFormResponseDto,
} from './dto/create-form-version.dto';
import { FormDefinitionsService } from './form-definitions.service';
import { FormRenderService } from './form-render.service';
import { FormResponseValidationService } from './form-response-validation.service';
import { FormVersionsService } from './form-versions.service';

@ApiTags('forms')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Service catalog administration or public discovery opt-out',
  authorityRequirement: 'Catalog configuration authority for protected routes',
  actorSource: 'Administrator or anonymous reader for explicitly public catalog routes',
  primarySecurityInvariant: 'Published catalog visibility does not grant case or decision access',
})
@Controller('forms')
export class FormsController {
  constructor(
    private readonly formDefinitionsService: FormDefinitionsService,
    private readonly formVersionsService: FormVersionsService,
    private readonly formRenderService: FormRenderService,
    private readonly formResponseValidationService: FormResponseValidationService,
  ) {}

  @Post('definitions')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_MANAGE)
  @ApiOperation({ summary: 'Create a form definition linked to a government service version' })
  createDefinition(@Body() dto: CreateFormDefinitionDto) {
    return this.formDefinitionsService.create(dto);
  }

  @Get('definitions')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_READ)
  @ApiOperation({ summary: 'List form definitions' })
  listDefinitions(@Query('governmentServiceVersionId') governmentServiceVersionId?: string) {
    return this.formDefinitionsService.findAll({ governmentServiceVersionId });
  }

  @Get('definitions/:id')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_READ)
  @ApiOperation({ summary: 'Get a form definition by id' })
  getDefinition(@Param('id', ParseUUIDPipe) id: string) {
    return this.formDefinitionsService.findOne(id);
  }

  @Post('versions')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_MANAGE)
  @ApiOperation({ summary: 'Create a draft form version' })
  createVersion(@Body() dto: CreateFormVersionDto) {
    return this.formVersionsService.create(dto);
  }

  @Post('definitions/:formDefinitionId/versions/next')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_MANAGE)
  @ApiOperation({ summary: 'Create a new draft version superseding the latest published version' })
  createNextVersion(
    @Param('formDefinitionId', ParseUUIDPipe) formDefinitionId: string,
    @Body() dto: CreateNextFormVersionDto,
  ) {
    return this.formVersionsService.createNextVersion(formDefinitionId, dto);
  }

  @Patch('versions/:id')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_MANAGE)
  @ApiOperation({ summary: 'Update a draft form version metadata' })
  updateDraftVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDraftFormVersionDto,
  ) {
    return this.formVersionsService.updateDraft(id, dto);
  }

  @Patch('versions/:id/publish')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_FORM_PUBLISH)
  @ApiOperation({ summary: 'Publish a draft form version' })
  publishVersion(@Param('id', ParseUUIDPipe) id: string) {
    return this.formVersionsService.publish(id);
  }

  @Get('versions/:id')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_READ)
  @ApiOperation({ summary: 'Get a form version by id' })
  getVersion(@Param('id', ParseUUIDPipe) id: string) {
    return this.formVersionsService.findOne(id);
  }

  @Get('definitions/:formDefinitionId/versions')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_READ)
  @ApiOperation({ summary: 'List versions for a form definition' })
  listVersions(@Param('formDefinitionId', ParseUUIDPipe) formDefinitionId: string) {
    return this.formVersionsService.findByDefinition(formDefinitionId);
  }

  @Get('versions/:id/schema')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_READ)
  @ApiOperation({ summary: 'Render a frontend-neutral form schema for a version' })
  renderSchema(@Param('id', ParseUUIDPipe) id: string, @Query('locale') locale?: string) {
    return this.formRenderService.renderFormSchema(id, locale ?? 'default');
  }

  @Get('versions/:id/reconstruct')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_READ)
  @ApiOperation({ summary: 'Reconstruct a historical form version with full structure' })
  reconstructVersion(@Param('id', ParseUUIDPipe) id: string) {
    return this.formVersionsService.getReconstructableVersion(id);
  }

  @Post('validate-response')
  @RequirePermissions(PermissionCodes.SERVICE_CATALOG_READ)
  @ApiOperation({ summary: 'Statelessly validate answers against a form version' })
  validateResponse(@Body() dto: ValidateFormResponseDto) {
    return this.formResponseValidationService.validateResponse(dto.formVersionId, dto.answers);
  }
}
