import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

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
@Controller('forms')
export class FormsController {
  constructor(
    private readonly formDefinitionsService: FormDefinitionsService,
    private readonly formVersionsService: FormVersionsService,
    private readonly formRenderService: FormRenderService,
    private readonly formResponseValidationService: FormResponseValidationService,
  ) {}

  @Post('definitions')
  @ApiOperation({ summary: 'Create a form definition linked to a government service version' })
  createDefinition(@Body() dto: CreateFormDefinitionDto) {
    return this.formDefinitionsService.create(dto);
  }

  @Get('definitions')
  @ApiOperation({ summary: 'List form definitions' })
  listDefinitions(@Query('governmentServiceVersionId') governmentServiceVersionId?: string) {
    return this.formDefinitionsService.findAll({ governmentServiceVersionId });
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get a form definition by id' })
  getDefinition(@Param('id', ParseUUIDPipe) id: string) {
    return this.formDefinitionsService.findOne(id);
  }

  @Post('versions')
  @ApiOperation({ summary: 'Create a draft form version' })
  createVersion(@Body() dto: CreateFormVersionDto) {
    return this.formVersionsService.create(dto);
  }

  @Post('definitions/:formDefinitionId/versions/next')
  @ApiOperation({ summary: 'Create a new draft version superseding the latest published version' })
  createNextVersion(
    @Param('formDefinitionId', ParseUUIDPipe) formDefinitionId: string,
    @Body() dto: CreateNextFormVersionDto,
  ) {
    return this.formVersionsService.createNextVersion(formDefinitionId, dto);
  }

  @Patch('versions/:id')
  @ApiOperation({ summary: 'Update a draft form version metadata' })
  updateDraftVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDraftFormVersionDto,
  ) {
    return this.formVersionsService.updateDraft(id, dto);
  }

  @Patch('versions/:id/publish')
  @ApiOperation({ summary: 'Publish a draft form version' })
  publishVersion(@Param('id', ParseUUIDPipe) id: string) {
    return this.formVersionsService.publish(id);
  }

  @Get('versions/:id')
  @ApiOperation({ summary: 'Get a form version by id' })
  getVersion(@Param('id', ParseUUIDPipe) id: string) {
    return this.formVersionsService.findOne(id);
  }

  @Get('definitions/:formDefinitionId/versions')
  @ApiOperation({ summary: 'List versions for a form definition' })
  listVersions(@Param('formDefinitionId', ParseUUIDPipe) formDefinitionId: string) {
    return this.formVersionsService.findByDefinition(formDefinitionId);
  }

  @Get('versions/:id/schema')
  @ApiOperation({ summary: 'Render a frontend-neutral form schema for a version' })
  renderSchema(@Param('id', ParseUUIDPipe) id: string, @Query('locale') locale?: string) {
    return this.formRenderService.renderFormSchema(id, locale ?? 'default');
  }

  @Get('versions/:id/reconstruct')
  @ApiOperation({ summary: 'Reconstruct a historical form version with full structure' })
  reconstructVersion(@Param('id', ParseUUIDPipe) id: string) {
    return this.formVersionsService.getReconstructableVersion(id);
  }

  @Post('validate-response')
  @ApiOperation({ summary: 'Statelessly validate answers against a form version' })
  validateResponse(@Body() dto: ValidateFormResponseDto) {
    return this.formResponseValidationService.validateResponse(dto.formVersionId, dto.answers);
  }
}
